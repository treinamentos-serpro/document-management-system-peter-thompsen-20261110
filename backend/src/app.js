const express = require('express');
const documentRoutes = require('./routes/documents.routes');
const multer = require('multer');

const app = express();
const PORT = require('./config').port;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(documentRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof multer.MulterError) {
    const isFileTooLarge = error.code === 'LIMIT_FILE_SIZE';
    res.status(isFileTooLarge ? 413 : 400).json({
      error: {
        code: isFileTooLarge ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD',
        message: isFileTooLarge
          ? 'O arquivo excede o limite permitido.'
          : 'A requisição de upload é inválida.',
      },
    });
    return;
  }

  const status = error.statusCode || 500;
  res.status(status).json({
    error: {
      code: error.code || 'STORAGE_ERROR',
      message: error.publicMessage || 'Não foi possível concluir a operação.',
    },
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
