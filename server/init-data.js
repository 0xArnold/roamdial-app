import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { count, upsertMany, setMeta, getDb } from './db.js';
const seed = fileURLToPath(new URL('../data/stations.json.gz', import.meta.url));
if (count() === 0 && existsSync(seed)) {
  const data = JSON.parse(gunzipSync(readFileSync(seed)));
  upsertMany(data.stations);
  setMeta('seed_snapshot', data.snapshot);
  console.log(`Initialized ${count()} stations from ${data.source} (${data.snapshot})`);
}
getDb().close();
