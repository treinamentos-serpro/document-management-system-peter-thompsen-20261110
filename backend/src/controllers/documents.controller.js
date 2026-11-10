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

  res.set('X-Content-Type-Options', 'nosniff');
  res.download(filePath, document.originalName, (error) => {
    if (!error) return;
    if (res.headersSent) {
      res.destroy(error);
      return;
    }
    if (error.code === 'ENOENT') {
      res.status(404).json({
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Documento não encontrado.',
        },
      });
      return;
    }
    next(error);
  });
}

module.exports = { upload, list, download };