import { useState } from 'react';
import { formatBytes } from '../utils/format.js';

export default function UploadComponent({ onUpload, message }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  async function submitUpload(event) {
    event.preventDefault();
    if (!selectedFile) return;

    const form = event.currentTarget;
    setIsUploading(true);
    try {
      const uploaded = await onUpload(selectedFile);
      if (uploaded) {
        setSelectedFile(null);
        form.reset();
      }
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-title">
      <div className="section-heading">
        <div className="step-number">01</div>
        <div>
          <h2 id="upload-title">Adicionar documento</h2>
          <p>Arquivos de até 10 MB</p>
        </div>
      </div>
      <form className="upload-form" onSubmit={submitUpload}>
        <label className="file-picker" htmlFor="document-file">
          <span className="file-picker-icon" aria-hidden="true">+</span>
          <span className="file-picker-copy">
            <strong>{selectedFile ? selectedFile.name : 'Escolher arquivo'}</strong>
            <span>{selectedFile ? formatBytes(selectedFile.size) : 'Selecione um arquivo no seu dispositivo'}</span>
          </span>
          <input
            id="document-file"
            type="file"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
          />
        </label>
        <button type="submit" className="button button-primary" disabled={!selectedFile || isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar documento'}
        </button>
      </form>
      {message && (
        <p className={`feedback feedback-${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </section>
  );
}