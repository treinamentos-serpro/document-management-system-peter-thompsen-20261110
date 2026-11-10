const fs = require('node:fs/promises');
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
    await fs.unlink(file.path).catch(() => {});
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
    throw createHttpError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  const filePath = repository.getFilePath(document);
  try {
    await fs.access(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw createHttpError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
    }
    throw createHttpError(500, 'STORAGE_ERROR', 'Não foi possível ler o documento.');
  }

  return { document, filePath };
}

module.exports = { createDocument, listDocuments, getDocumentForDownload };