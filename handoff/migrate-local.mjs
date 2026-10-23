// Optional handoff utility. --local is fixed; this cannot select a remote database.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const hosting = JSON.parse(readFileSync(path.join(root, '.openai/hosting.json'), 'utf8'));
if (hosting.d1 !== 'DB') throw new Error('Review local binding setup: expected the original DB binding.');
mkdirSync(path.join(root, '.wrangler'), { recursive: true });
const configPath = path.join(root, '.wrangler/handoff-local.json');
writeFileSync(configPath, JSON.stringify({
  name: 'nextrole-local',
  compatibility_date: '2026-05-15',
  d1_databases: [{
    binding: 'DB',
    database_name: 'site-creator-d1',
    // Same local placeholder used by the preserved vite.config.ts.
    database_id: '00000000-0000-4000-8000-000000000000',
    migrations_dir: path.join(root, 'drizzle'),
  }],
}, null, 2) + '\n');
console.log('Applying pending migrations to .wrangler/state only. Production is never targeted.');
const result = spawnSync(process.execPath, [
  '--import', './scripts/sites-env.mjs',
  './node_modules/wrangler/bin/wrangler.js',
  'd1', 'migrations', 'apply', 'DB', '--local',
  '--config', configPath,
  '--persist-to', '.wrangler/state',
], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
