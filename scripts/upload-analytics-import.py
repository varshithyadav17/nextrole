"""Send prepared workbook packets using a short-lived, exact-source upload permission.

The permission token is read from hidden stdin, never arguments or a file.
No private row content or credentials are printed. Python standard library only.
"""
import argparse
import json
import sys
import termios
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


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
        token = json.loads(sys.stdin.readline())['token']
    finally:
        if settings:
            termios.tcsetattr(sys.stdin, termios.TCSANOW, settings)
    if len(token) != 43:
        raise ValueError('Invalid upload permission.')
    directory = Path(args.directory)

    def send(operation, data):
        payload = data if isinstance(data, str) else json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        body = json.dumps({'operation': operation, 'payload': payload}, ensure_ascii=False).encode()
        for attempt in range(3):
            request = Request(args.origin + '/api/host/imports/upload', data=body, method='POST', headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
            try:
                with urlopen(request, timeout=50) as response:
                    return json.load(response)
            except HTTPError as error:
                if error.code >= 500 and attempt < 2:
                    time.sleep(attempt + 1)
                    continue
                raise RuntimeError('Upload rejected with HTTP ' + str(error.code) + '; accepted pages are preserved.') from None
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
        for index, packet in enumerate(pages):
            send('append', packet)
            if (index + 1) % 20 == 0 or index + 1 == len(pages):
                print(json.dumps({'acceptedPages': index + 1, 'totalPages': len(pages)}), flush=True)
    result = send('finalize', {'id': identifier})
    print(json.dumps({'id': identifier, 'state': result['state'], 'sourceRows': result['sourceRows'], 'summary': result.get('summary')}), flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
