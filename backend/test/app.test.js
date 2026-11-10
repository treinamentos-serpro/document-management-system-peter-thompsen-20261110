const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-api-test-'));
process.env.STORAGE_DIR = storageDir;
process.env.MAX_FILE_SIZE_BYTES = '8';

const repository = require('../src/repositories/documents.repository');
const config = require('../src/config');
const app = require('../src/app');

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('a API aplica os contratos de upload, listagem e download', async (t) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'X-User-Id': 'alice' };
  const missingFile = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers,
    body: new FormData(),
  });
  assert.strictEqual(missingFile.status, 400);
  assert.strictEqual((await missingFile.json()).error.code, 'FILE_REQUIRED');

  const unexpectedField = new FormData();
  unexpectedField.append('attachment', new Blob(['hello']), 'hello.txt');
  const invalidUpload = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers,
    body: unexpectedField,
  });
  assert.strictEqual(invalidUpload.status, 400);
  assert.strictEqual((await invalidUpload.json()).error.code, 'INVALID_UPLOAD');

  const oversizedForm = new FormData();
  oversizedForm.append('file', new Blob(['123456789']), 'large.txt');
  const oversized = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers,
    body: oversizedForm,
  });
  assert.strictEqual(oversized.status, 413);
  assert.strictEqual((await oversized.json()).error.code, 'FILE_TOO_LARGE');

  const form = new FormData();
  form.append('file', new Blob(['hello'], { type: 'text/plain' }), 'hello.txt');
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers,
    body: form,
  });
  assert.strictEqual(uploadResponse.status, 201);
  const { document } = await uploadResponse.json();
  assert.deepStrictEqual(Object.keys(document).sort(), [
    'id', 'originalName', 'owner', 'size', 'uploadedAt',
  ]);
  assert.strictEqual(document.originalName, 'hello.txt');
  assert.strictEqual(document.size, 5);
  assert.strictEqual(document.owner, 'alice');

  const ownList = await fetch(`${baseUrl}/documents`, { headers });
  assert.deepStrictEqual((await ownList.json()).documents.map((item) => item.id), [document.id]);

  const otherList = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'bob' },
  });
  assert.deepStrictEqual((await otherList.json()).documents, []);

  const forbiddenDownload = await fetch(
    `${baseUrl}/documents/${document.id}/download`,
    { headers: { 'X-User-Id': 'bob' } }
  );
  assert.strictEqual(forbiddenDownload.status, 404);

  const download = await fetch(`${baseUrl}/documents/${document.id}/download`, { headers });
  assert.strictEqual(download.status, 200);
  assert.strictEqual(await download.text(), 'hello');
  assert.match(download.headers.get('content-disposition'), /filename="hello\.txt"/);

  const storedDocument = repository.findByIdAndOwner(document.id, 'alice');
  t.mock.method(repository, 'fileExists', async () => {
    await fs.promises.unlink(repository.getFilePath(storedDocument));
    return true;
  });
  const disappearedDuringDownload = await fetch(
    `${baseUrl}/documents/${document.id}/download`,
    { headers }
  );
  assert.strictEqual(disappearedDuringDownload.status, 404);
  assert.strictEqual(
    (await disappearedDuringDownload.json()).error.code,
    'DOCUMENT_NOT_FOUND'
  );

  const noIdentity = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(noIdentity.status, 401);
  assert.strictEqual((await noIdentity.json()).error.code, 'USER_ID_REQUIRED');

  const previousDemoMode = config.allowDemoUserHeader;
  config.allowDemoUserHeader = false;
  const productionRequest = await fetch(`${baseUrl}/documents`, { headers });
  config.allowDemoUserHeader = previousDemoMode;
  assert.strictEqual(productionRequest.status, 503);
  assert.strictEqual(
    (await productionRequest.json()).error.code,
    'AUTHENTICATION_NOT_CONFIGURED'
  );

  const unknownRoute = await fetch(`${baseUrl}/route-that-does-not-exist`);
  assert.strictEqual(unknownRoute.status, 404);
  assert.strictEqual((await unknownRoute.json()).error.code, 'ROUTE_NOT_FOUND');

  t.mock.method(repository, 'listByOwner', () => {
    const error = new Error('disk full at /private/storage');
    error.code = 'ENOSPC';
    throw error;
  });
  const internalFailure = await fetch(`${baseUrl}/documents`, { headers });
  assert.strictEqual(internalFailure.status, 500);
  assert.deepStrictEqual(await internalFailure.json(), {
    error: {
      code: 'STORAGE_ERROR',
      message: 'Não foi possível acessar o armazenamento.',
    },
  });
});

test.after(() => {
  fs.rmSync(storageDir, { recursive: true, force: true });
});
