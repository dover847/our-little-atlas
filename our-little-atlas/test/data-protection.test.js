const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('corrupted or invalid persisted data stops startup without touching its bytes', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-protection-'));
  try {
    const file = path.join(directory, 'state.json');
    for (const original of ['{broken', 'null', '[]']) {
      fs.writeFileSync(file, original);
      const run = spawnSync(process.execPath, ['server.js'], {
        cwd: path.join(__dirname, '..'), timeout: 5000,
        env: { ...process.env, ATLAS_PASSWORD: 'test-only-password', DATA_FILE: file },
        encoding: 'utf8',
      });
      assert.equal(run.status, 1);
      assert.match(run.stderr, /refusing to start/);
      assert.equal(fs.readFileSync(file, 'utf8'), original);
      assert.equal(fs.existsSync(file + '.previous'), false);
    }
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
