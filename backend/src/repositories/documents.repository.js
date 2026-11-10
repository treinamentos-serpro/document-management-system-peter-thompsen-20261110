const fs = require('node:fs/promises');
const path = require('node:path');
const config = require('../config');

const STORAGE_NAME_PATTERN =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

const documents = new Map();

function add(document) {
  documents.set(document.id, document);
  return document;
}

function listByOwner(owner) {
  return [...documents.values()]
    .filter((document) => document.owner === owner)
    .sort((left, right) => {
      const byDate = right.uploadedAt.localeCompare(left.uploadedAt);
      return byDate || left.id.localeCompare(right.id);
    });
}

function findByIdAndOwner(id, owner) {
  const document = documents.get(id);
  return document?.owner === owner ? document : null;
}

function getFilePath(document) {
  return getStorageFilePath(document.storageName);
}

function getStorageFilePath(storageName) {
  if (!STORAGE_NAME_PATTERN.test(storageName)) {
    throw new Error('Invalid storage name.');
  }

  const storageDir = path.resolve(config.storageDir);
  const filePath = path.resolve(storageDir, storageName);
  const relativePath = path.relative(storageDir, filePath);
  if (
    !relativePath
    || relativePath === '..'
    || relativePath.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativePath)
  ) {
    throw new Error('Invalid storage path.');
  }
  return filePath;
}

async function fileExists(storageName) {
  try {
    await fs.access(getStorageFilePath(storageName));
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function removeFile(storageName) {
  return fs.unlink(getStorageFilePath(storageName));
}

module.exports = {
  add,
  listByOwner,
  findByIdAndOwner,
  getFilePath,
  fileExists,
  removeFile,
};