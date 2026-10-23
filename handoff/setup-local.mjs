// Optional handoff utility. Creates local configuration only; no HTTP or deployment.
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
if (!existsSync(path.join(root, 'package.json'))) throw new Error('Run from an extracted NextRole handoff.');
const ignorePath = path.join(root, '.gitignore');
const ignore = readFileSync(ignorePath, 'utf8');
if (!ignore.split(/\r?\n/).includes('.dev.vars')) {
  writeFileSync(ignorePath, ignore + '\n# Local handoff secrets\n.dev.vars\n.dev.vars.*\n!.dev.vars.example\n');
}
const target = path.join(root, '.dev.vars');
if (existsSync(target)) {
  console.log('Existing .dev.vars preserved. No secrets changed.');
} else {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = privateKey.export({ format: 'jwk' });
  const publicKey = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]).toString('base64url');
  const lines = [
    '# Fresh development configuration. Never use as a production restore.',
    'NEXTROLE_OWNER_EMAIL="seedy@sites.test"',
    'KEYRING_ENCRYPTION_KEY="' + randomBytes(32).toString('hex') + '"',
    'VAPID_PUBLIC_KEY="' + publicKey + '"',
    'VAPID_PRIVATE_KEY="' + jwk.d + '"',
    'VAPID_SUBJECT="mailto:developer@example.test"',
    '',
  ];
  writeFileSync(target, lines.join('\n'), { mode: 0o600, flag: 'wx' });
  console.log('Created fresh local-only .dev.vars. No secret values were printed.');
}
console.log('Next: node handoff/migrate-local.mjs, then pnpm dev. Keep the dev server on loopback.');
