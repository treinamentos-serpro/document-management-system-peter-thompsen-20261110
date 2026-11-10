const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const repository = require('../src/repositories/documents.repository');
const config = require('../src/config');

test('repository checks and removes local files', async (t) => {
  const storageName = randomUUID();
  const filePath = path.join(config.storageDir, storageName);
  t.after(() => fs.rm(filePath, { force: true }));

  await fs.writeFile(filePath, 'document content');
  assert.equal(await repository.fileExists(storageName), true);

  await repository.removeFile(storageName);
  assert.equal(await repository.fileExists(storageName), false);
});

test('repository rejects storage names that could escape the local directory', () => {
  assert.throws(() => repository.getFilePath({ storageName: '../outside' }));
});
