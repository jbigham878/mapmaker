/**
 * Preload all predefined battles by calling the Tines webhook and save to
 * public/preloaded-battles.json — run once before deploying.
 *
 * Usage:
 *   TINES_WEBHOOK_URL=https://... node scripts/preload-battles.mjs
 *   OR if .env is present:
 *   node scripts/preload-battles.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually (avoid requiring dotenv as a dep for this script)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
}

const TINES_WEBHOOK = process.env.TINES_WEBHOOK_URL;
if (!TINES_WEBHOOK) {
  console.error('ERROR: TINES_WEBHOOK_URL not set');
  process.exit(1);
}

const BATTLES = [
  // Revolutionary War
  'Battle of Lexington and Concord',
  'Battle of Bunker Hill',
  'Battle of Long Island',
  'Battle of Harlem Heights',
  'Battle of White Plains',
  'Battle of Fort Washington',
  'Battle of Trenton',
  'Battle of Princeton',
  'Battle of Brandywine',
  'Battle of Paoli',
  'Battle of Germantown',
  'Battle of Saratoga',
  'Battle of Monmouth',
  'Battle of Cowpens',
  'Battle of Guilford Court House',
  'Siege of Yorktown',
  // War of 1812
  'Battle of Queenston Heights',
  'Battle of Lake Erie',
  'Battle of the Thames',
  'Battle of Horseshoe Bend',
  'Battle of Bladensburg',
  'Burning of Washington',
  'Battle of Baltimore',
  'Battle of Plattsburgh',
  'Battle of New Orleans',
  // Civil War
  'Battle of Fort Sumter',
  'First Battle of Bull Run',
  'Battle of Shiloh',
  'Battle of Antietam',
  'Battle of Fredericksburg',
  'Battle of Chancellorsville',
  'Battle of Gettysburg',
  'Siege of Vicksburg',
  'Battle of Chickamauga',
  'Battle of the Wilderness',
  'Battle of Spotsylvania Court House',
  'Battle of Cold Harbor',
  'Battle of Atlanta',
  'Battle of Franklin',
  'Battle of Nashville',
  'Battle of Appomattox Court House',
];

const TIMEOUT_MS = 30_000;
const DELAY_MS   = 500; // be kind to Tines rate limits

async function fetchBattle(name) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(TINES_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: name }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'preloaded-battles.json');

// Load existing data so we can skip already-fetched battles
let existing = {};
if (fs.existsSync(OUTPUT_PATH)) {
  try { existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8')); } catch {}
}

const results = { ...existing };
let fetched = 0;
let skipped = 0;
let failed  = 0;

for (const name of BATTLES) {
  const key = name.toLowerCase().trim().replace(/\s+/g, ' ');
  if (results[key]) {
    console.log(`  skip  ${name}`);
    skipped++;
    continue;
  }
  process.stdout.write(`  fetch ${name} ... `);
  try {
    const data = await fetchBattle(name);
    results[key] = data;
    console.log('OK');
    fetched++;
    // Save incrementally so partial runs aren't lost
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
    await new Promise(r => setTimeout(r, DELAY_MS));
  } catch (err) {
    console.log(`FAILED (${err.message})`);
    failed++;
  }
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
console.log(`\nDone. fetched=${fetched} skipped=${skipped} failed=${failed}`);
console.log(`Saved to ${OUTPUT_PATH}`);
