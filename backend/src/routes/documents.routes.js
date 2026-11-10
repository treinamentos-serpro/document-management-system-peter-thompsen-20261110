const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const express = require('express');
const multer = require('multer');
const config = require('../config');
const controller = require('../controllers/documents.controller');

const router = express.Router();

function requireUser(req, res, next) {
  if (!config.allowDemoUserHeader) {
    res.status(503).json({
      error: {
        code: 'AUTHENTICATION_NOT_CONFIGURED',
        message: 'A autenticação não está configurada neste ambiente.',
      },
    });
    return;
  }

  const userId = req.get('X-User-Id')?.trim();
  if (!userId || userId.length > 100) {
    res.status(401).json({
      error: {
        code: 'USER_ID_REQUIRED',
        message: 'Informe um identificador de usuário válido.',
      },
    });
    return;
  }

  req.userId = userId;
  next();
}

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      fs.mkdir(config.storageDir, { recursive: true })
        .then(() => callback(null, config.storageDir), callback);
    },
    filename(req, file, callback) {
      callback(null, randomUUID());
    },
  }),
  limits: {
    fileSize: config.maxFileSizeBytes,
    files: 1,
    fields: 0,
  },
});

router.post('/upload', requireUser, upload.single('file'), controller.upload);
router.get('/documents', requireUser, controller.list);
router.get('/documents/:id/download', requireUser, controller.download);

module.exports = router;