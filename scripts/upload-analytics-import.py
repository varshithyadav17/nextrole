"""Send prepared workbook packets using a short-lived, exact-source upload permission.

The permission token is read from hidden stdin, never arguments or a file.
No private row content or credentials are printed. Python standard library only.
"""
import argparse
import json
import sys
import termios
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, HTTPRedirectHandler, build_opener


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', required=True)
    parser.add_argument('--origin', required=True)
    args = parser.parse_args()
    if not args.origin.startswith('https://') or '/' in args.origin[8:]:
        raise ValueError('Provide the exact HTTPS site origin, without a path.')
    settings = termios.tcgetattr(sys.stdin) if sys.stdin.isatty() else None
    try:
        if settings:
            hidden = settings.copy()
            hidden[3] &= ~termios.ECHO
            termios.tcsetattr(sys.stdin, termios.TCSANOW, hidden)
        print('Ready for upload permission JSON on stdin (input is hidden).', flush=True)
        credentials = json.loads(sys.stdin.readline())
        token = credentials['token']
        site_access = credentials.get('siteAccessToken')
    finally:
        if settings:
            termios.tcsetattr(sys.stdin, termios.TCSANOW, settings)
    if len(token) != 43:
        raise ValueError('Invalid upload permission.')
    directory = Path(args.directory)

    class NoRedirects(HTTPRedirectHandler):
        def redirect_request(self, request, fp, code, message, headers, new_url):
            return None

    opener = build_opener(NoRedirects())

    def send(operation, data):
        payload = data if isinstance(data, str) else json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        body = json.dumps({'operation': operation, 'payload': payload}, ensure_ascii=False).encode()
        for attempt in range(3):
            request = Request(args.origin + '/api/host/imports/upload', data=body, method='POST', headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', **({'OAI-Sites-Authorization': 'Bearer ' + site_access} if site_access else {})})
            try:
                with opener.open(request, timeout=50) as response:
                    return json.load(response)
            except HTTPError as error:
                if error.code >= 500 and attempt < 2:
                    time.sleep(attempt + 1)
                    continue
                try:
                    detail = json.loads(error.read(2000)).get('error', '')
                except (ValueError, AttributeError):
                    detail = ''
                raise RuntimeError('Upload rejected with HTTP ' + str(error.code) + (': ' + detail if detail else '') + '; accepted pages are preserved.') from None
            except (URLError, TimeoutError):
                if attempt == 2:
                    raise RuntimeError('Upload connection failed; accepted pages are preserved.') from None
                time.sleep(attempt + 1)
        raise RuntimeError('Upload did not complete.')

    manifest_text = (directory / 'manifest.json').read_text()
    manifest = json.loads(manifest_text)
    start = send('begin', manifest_text)
    identifier = start['id']
    print(json.dumps({'id': identifier, 'state': start['state'], 'receivedPages': start['receivedPages']}), flush=True)
    if not start.get('alreadyImported'):
        parts = json.loads((directory / 'files.json').read_text())
        for source in manifest['sources']:
            file_data = ''.join(p['data'] for p in sorted((p for p in parts if p['source'] == source['sha256']), key=lambda p: p['part']))
            send('file', {'id': identifier, 'source': source['sha256'], 'data': file_data})
            print(json.dumps({'originalStored': source['sha256'], 'bytes': source['bytes']}), flush=True)
        pages = json.loads((directory / 'pages.json').read_text())
        # Pages have independent immutable checksums; retries are safe in any order.
        with ThreadPoolExecutor(max_workers=4) as pool:
            futures = [pool.submit(send, 'append', packet) for packet in pages]
            accepted = 0
            try:
                for future in as_completed(futures):
                    future.result()
                    accepted += 1
                    if accepted % 10 == 0 or accepted == len(pages):
                        print(json.dumps({'acceptedPages': accepted, 'totalPages': len(pages)}), flush=True)
            except Exception:
                for future in futures:
                    future.cancel()
                raise
    result = send('finalize', {'id': identifier})
    print(json.dumps({'id': identifier, 'state': result['state'], 'sourceRows': result['sourceRows'], 'summary': result.get('summary')}), flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
