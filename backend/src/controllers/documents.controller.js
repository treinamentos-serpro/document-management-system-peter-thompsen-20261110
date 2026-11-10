const documentService = require('../services/documents.service');

function publicDocument({ storageName, ...document }) {
  return document;
}

async function upload(req, res) {
  const document = await documentService.createDocument(req.file, req.userId);
  res.status(201).json({ document: publicDocument(document) });
}

function list(req, res) {
  const documents = documentService.listDocuments(req.userId).map(publicDocument);
  res.json({ documents });
}

async function download(req, res, next) {
  const { document, filePath } = await documentService.getDocumentForDownload(
    req.params.id,
    req.userId
  );

  res.type(document.originalName);
  res.download(filePath, document.originalName, (error) => {
    if (!error) return;
    if (res.headersSent) {
      res.destroy(error);
      return;
    }
    next(error);
  });
}

module.exports = { upload, list, download };