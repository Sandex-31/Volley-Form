/**
 * Seed the local Firebase emulator with a copy of the production data.
 *
 * SAFETY: this script only ever sends GET requests to production.
 * Every write (PUT) goes to the local emulator on 127.0.0.1.
 *
 * Usage: npm --prefix dev run db   (terminal 1, keep it running)
 *        npm --prefix dev run seed (terminal 2)
 */

import { readFile } from 'node:fs/promises';

const PROD_URL = 'https://volleyball-exercises-9fd18-default-rtdb.europe-west1.firebasedatabase.app';
const EMULATOR_URL = 'http://127.0.0.1:9000';
const NAMESPACE = 'demo-wapatanka-default-rtdb';

// Read the node names from APP_CONSTANTS.FIREBASE_REFS, so new nodes are picked up automatically
const constants = await readFile(new URL('../src/config/constants.js', import.meta.url), 'utf8');
const refsBlock = constants.match(/FIREBASE_REFS\s*:\s*\{([^}]*)\}/);
if (!refsBlock) {
    console.error('❌ Could not find FIREBASE_REFS in src/config/constants.js');
    process.exit(1);
}
const nodes = [...refsBlock[1].matchAll(/:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);

// Make sure the emulator is running before touching anything
try {
    await fetch(`${EMULATOR_URL}/.json?ns=${NAMESPACE}&shallow=true`);
} catch {
    console.error('❌ The Firebase emulator is not running.');
    console.error('   Start it first in another terminal:  npm --prefix dev run db');
    process.exit(1);
}

console.log(`🌱 Copying ${nodes.length} nodes from production (read-only) into the local emulator...\n`);

const summary = [];
for (const node of nodes) {
    // GET only — never write to production
    const res = await fetch(`${PROD_URL}/${node}.json`);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
        summary.push({ node, result: `skipped (${data?.error || 'HTTP ' + res.status})` });
        continue;
    }
    if (data === null) {
        summary.push({ node, result: 'skipped (empty)' });
        continue;
    }

    const put = await fetch(`${EMULATOR_URL}/${node}.json?ns=${NAMESPACE}`, {
        method: 'PUT',
        headers: { Authorization: 'Bearer owner' },
        body: JSON.stringify(data)
    });
    const count = typeof data === 'object' ? Object.keys(data).length : 1;
    summary.push({ node, result: put.ok ? `copied (${count} items)` : `emulator error (HTTP ${put.status})` });
}

console.table(summary);
console.log('\n✅ Done. Open the database viewer at http://127.0.0.1:4000/database');
