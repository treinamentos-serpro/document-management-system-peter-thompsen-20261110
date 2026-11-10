const { randomUUID } = require('node:crypto');
const repository = require('../repositories/documents.repository');

function createHttpError(statusCode, code, publicMessage) {
  const error = new Error(publicMessage);
  error.statusCode = statusCode;
  error.code = code;
  error.publicMessage = publicMessage;
  return error;
}

function normalizeOriginalName(name) {
  const baseName = String(name || '').replace(/\\/g, '/').split('/').pop();
  const normalized = baseName.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return normalized || 'document';
}

function documentNotFoundError() {
  return createHttpError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
}

async function createDocument(file, owner) {
  if (!file) {
    throw createHttpError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo file.');
  }

  const document = {
    id: randomUUID(),
    originalName: normalizeOriginalName(file.originalname),
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storageName: file.filename,
  };

  try {
    repository.add(document);
  } catch (error) {
    await repository.removeFile(file.path).catch(() => {});
    throw createHttpError(500, 'STORAGE_ERROR', 'Não foi possível salvar o documento.');
  }

  return document;
}

function listDocuments(owner) {
  return repository.listByOwner(owner);
}

async function getDocumentForDownload(id, owner) {
  const document = repository.findByIdAndOwner(id, owner);
  if (!document) {
    throw documentNotFoundError();
  }

  const filePath = repository.getFilePath(document);
  let fileExists;
  try {
    fileExists = await repository.fileExists(filePath);
  } catch {
    throw createHttpError(500, 'STORAGE_ERROR', 'Não foi possível ler o documento.');
  }
  if (!fileExists) throw documentNotFoundError();

  return { document, filePath };
}

module.exports = { createDocument, listDocuments, getDocumentForDownload };