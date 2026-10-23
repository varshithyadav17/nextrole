"""Verify the actual shipped ZIP, its manual and all local resource references."""
from pathlib import Path
import hashlib
import json
import re
import zipfile

root = Path(__file__).resolve().parent.parent
archive_path = root / 'public/downloads/Scout-Companion.zip'
release = json.loads(re.search(r'export const companionRelease = (.*) as const;', (root / 'lib/companion-release.ts').read_text(), re.S)[1])
checks = 0

def check(value, description):
    global checks
    assert value, description
    checks += 1

with zipfile.ZipFile(archive_path) as archive:
    check(archive.testzip() is None, 'ZIP CRC must pass')
    names = archive.namelist()
    manifest = json.loads(archive.read('manifest.json'))
    check(manifest == json.loads((root / 'companion/manifest.json').read_text()), 'Shipped manifest matches source')
    check(release['version'] == manifest['version'], 'Page version matches ZIP')
    check(release['bytes'] == archive_path.stat().st_size, 'Page download size matches ZIP')
    check(release['sha256'] == hashlib.sha256(archive_path.read_bytes()).hexdigest(), 'Page integrity hash matches ZIP')
    check(archive.read('SETUP.txt') == (root / 'public/downloads/Scout-Companion-Setup.txt').read_bytes(), 'Offline and downloaded manuals match')
    for name in names:
        check(archive.read(name) == (root / 'companion' / name).read_bytes(), 'Shipped file matches source: ' + name)
        check(not name.startswith('/') and '..' not in Path(name).parts, 'Archive paths remain relative: ' + name)
        if name.endswith('.html'):
            for target in re.findall(r'(?:href|src)="([^"#]+)"', archive.read(name).decode()):
                if not target.startswith(('https:', 'http:')):
                    check(target in names, 'HTML dependency exists: ' + target)
        if name.endswith('.mjs'):
            for target in re.findall(r"from ['\"]\./([^'\"]+)['\"]", archive.read(name).decode()):
                check(target in names, 'Module dependency exists: ' + target)
    check(manifest['background']['service_worker'] in names, 'Background worker exists')
    check(manifest['side_panel']['default_path'] in names, 'Side panel exists')
    check(manifest['action']['default_popup'] in names, 'Popup exists')
    for size, target in manifest['icons'].items():
        check(target in names and archive.read(target)[:8] == b'\x89PNG\r\n\x1a\n', 'Required store PNG icon exists: ' + size)
    check('notifications' in manifest['optional_permissions'] and 'notifications' not in manifest['permissions'], 'Desktop alerts remain an optional permission')
with zipfile.ZipFile(root / 'handoff/store/Scout-Companion-Store.zip') as store, zipfile.ZipFile(archive_path) as archive:
    check(store.testzip() is None, 'Store submission ZIP CRC passes')
    check(store.read('manifest.json') == archive.read('manifest.json'), 'Store manifest matches the developer-tested release')
    check(all(not name.endswith(('.md', '.txt')) for name in store.namelist()), 'Student setup/source documents are not shipped as store runtime files')
    check(all(store.read(name) == archive.read(name) for name in store.namelist()), 'Store runtime files match the tested developer package')
check((root / 'public' / release['download'].lstrip('/')).is_file(), 'Download route points to a file')
check((root / 'public' / release['guide'].lstrip('/')).is_file(), 'Guide route points to a file')
print(json.dumps({'passed': True, 'checks': checks, 'scope': 'Actual extension ZIP, manual, release metadata and dependency integrity', 'version': release['version']}))
