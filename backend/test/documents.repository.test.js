const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const repository = require('../src/repositories/documents.repository');

test('repository checks and removes local files', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-repository-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'document');

  await fs.writeFile(filePath, 'document content');
  assert.equal(await repository.fileExists(filePath), true);

  await repository.removeFile(filePath);
  assert.equal(await repository.fileExists(filePath), false);
});
