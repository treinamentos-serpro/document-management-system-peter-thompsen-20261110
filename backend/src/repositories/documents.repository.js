const path = require('node:path');
const config = require('../config');

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
  return path.join(config.storageDir, document.storageName);
}

module.exports = { add, listByOwner, findByIdAndOwner, getFilePath };