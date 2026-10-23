"""Verify the packaged source snapshot. Run before local setup or source edits."""
from pathlib import Path
import hashlib
import json
import sys

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'handoff/SOURCE-MANIFEST.json').read_text())
failures = []
for entry in manifest['source_files']:
    file = root / entry['path']
    if not file.is_file():
        failures.append(entry['path'] + ': missing')
    elif hashlib.sha256(file.read_bytes()).hexdigest() != entry['sha256']:
        failures.append(entry['path'] + ': changed')
if failures:
    print('\n'.join(failures))
    print('Source differs from the handoff snapshot. This is expected after intentional edits or local setup.')
    sys.exit(1)
print('Verified all ' + str(len(manifest['source_files'])) + ' packaged source files.')
