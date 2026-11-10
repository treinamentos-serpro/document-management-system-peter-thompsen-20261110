const { test } = require('node:test');
const assert = require('node:assert/strict');
const repository = require('../src/repositories/documents.repository');
const documentService = require('../src/services/documents.service');

test('createDocument rejects a missing file', async () => {
  await assert.rejects(documentService.createDocument(null, 'user-1'), {
    statusCode: 400,
    code: 'FILE_REQUIRED',
  });
});

test('createDocument stores normalized metadata', async (t) => {
  let savedDocument;
  t.mock.method(repository, 'add', (document) => {
    savedDocument = document;
  });

  const document = await documentService.createDocument({
    originalname: '../report\n.pdf',
    size: 12,
    filename: 'stored-file',
    path: '/storage/stored-file',
  }, 'user-1');

  assert.equal(document, savedDocument);
  assert.equal(document.originalName, 'report.pdf');
  assert.equal(document.owner, 'user-1');
  assert.equal(document.storageName, 'stored-file');
  assert.match(document.id, /^[\da-f-]{36}$/i);
});

test('getDocumentForDownload returns the owned document and its path', async (t) => {
  const document = { id: 'doc-1', owner: 'user-1' };
  t.mock.method(repository, 'findByIdAndOwner', () => document);
  t.mock.method(repository, 'getFilePath', () => '/storage/doc-1');
  t.mock.method(repository, 'fileExists', () => true);

  assert.deepEqual(
    await documentService.getDocumentForDownload('doc-1', 'user-1'),
    { document, filePath: '/storage/doc-1' }
  );
});

test('getDocumentForDownload returns the same not-found error for missing records or files', async (t) => {
  let foundDocument = null;
  t.mock.method(repository, 'findByIdAndOwner', () => foundDocument);
  await assert.rejects(documentService.getDocumentForDownload('missing', 'user-1'), {
    statusCode: 404,
    code: 'DOCUMENT_NOT_FOUND',
  });

  const document = { id: 'doc-1', owner: 'user-1' };
  foundDocument = document;
  t.mock.method(repository, 'getFilePath', () => '/storage/doc-1');
  t.mock.method(repository, 'fileExists', () => false);
  await assert.rejects(documentService.getDocumentForDownload('doc-1', 'user-1'), {
    statusCode: 404,
    code: 'DOCUMENT_NOT_FOUND',
  });
});

test('getDocumentForDownload translates filesystem errors to storage errors', async (t) => {
  t.mock.method(repository, 'findByIdAndOwner', () => ({ id: 'doc-1', owner: 'user-1' }));
  t.mock.method(repository, 'getFilePath', () => '/storage/doc-1');
  t.mock.method(repository, 'fileExists', () => {
    throw new Error('filesystem failure');
  });

  await assert.rejects(documentService.getDocumentForDownload('doc-1', 'user-1'), {
    statusCode: 500,
    code: 'STORAGE_ERROR',
  });
});

test('createDocument removes the uploaded file when metadata persistence fails', async (t) => {
  let removedPath;
  t.mock.method(repository, 'add', () => {
    throw new Error('repository failure');
  });
  t.mock.method(repository, 'removeFile', async (filePath) => {
    removedPath = filePath;
  });

  await assert.rejects(documentService.createDocument({
    originalname: 'report.pdf',
    size: 12,
    filename: 'stored-file',
    path: '/storage/stored-file',
  }, 'user-1'), {
    statusCode: 500,
    code: 'STORAGE_ERROR',
  });
  assert.equal(removedPath, '/storage/stored-file');
});
