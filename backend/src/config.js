const path = require('node:path');

function positiveIntegerFromEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;

  if (!/^\d+$/.test(value) || Number(value) <= 0) {
    throw new Error(`${name} deve ser um inteiro positivo.`);
  }

  return Number(value);
}

module.exports = {
  port: positiveIntegerFromEnv('PORT', 3000),
  maxFileSizeBytes: positiveIntegerFromEnv('MAX_FILE_SIZE_BYTES', 10 * 1024 * 1024),
  allowDemoUserHeader: process.env.NODE_ENV !== 'production',
  storageDir: path.resolve(
    process.env.STORAGE_DIR || path.join(__dirname, '../storage')
  ),
};