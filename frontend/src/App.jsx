import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { downloadDocument, listDocuments, uploadDocument } from './services/documents.js';
import './styles.css';

export default function App() {
  const [userId, setUserId] = useState(() => localStorage.getItem('dms-user-id') || 'demo-user');
  const [identityInput, setIdentityInput] = useState(userId);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    listDocuments(userId)
      .then((items) => {
        if (active) setDocuments(items);
      })
      .catch((error) => {
        if (active) setMessage({ type: 'error', text: error.message });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  async function refreshDocuments() {
    setMessage(null);
    setIsLoading(true);
    try {
      setDocuments(await listDocuments(userId));
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  function connectUser(event) {
    event.preventDefault();
    const nextUserId = identityInput.trim();
    if (!nextUserId || nextUserId.length > 100) {
      setMessage({ type: 'error', text: 'Use um identificador com até 100 caracteres.' });
      return;
    }
    localStorage.setItem('dms-user-id', nextUserId);
    setMessage(null);
    setUserId(nextUserId);
  }

  async function handleUpload(file) {
    setMessage(null);
    try {
      await uploadDocument(userId, file);
      setDocuments(await listDocuments(userId));
      setMessage({ type: 'success', text: 'Documento enviado.' });
      return true;
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
      return false;
    }
  }

  async function handleDownload(document) {
    setMessage(null);
    try {
      await downloadDocument(userId, document);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span className="brand-name">DMS<span>/</span></span>
        </a>
        <form className="identity-form" onSubmit={connectUser}>
          <label htmlFor="user-id">Usuário de demonstração</label>
          <input
            id="user-id"
            value={identityInput}
            maxLength={100}
            onChange={(event) => setIdentityInput(event.target.value)}
          />
          <button type="submit" className="button button-quiet">Aplicar</button>
        </form>
      </header>

      <main className="workspace">
        <section className="page-heading">
          <div>
            <p className="eyebrow">ESPAÇO PESSOAL</p>
            <h1>Documentos</h1>
          </div>
          <button type="button" className="button button-quiet refresh-button" onClick={refreshDocuments}>
            Atualizar lista
          </button>
        </section>

        <UploadComponent onUpload={handleUpload} message={message} />
        <DocumentList
          documents={documents}
          isLoading={isLoading}
          userId={userId}
          onDownload={handleDownload}
        />
        <footer className="workspace-footer">ARQUIVOS LOCAIS <span>·</span> METADADOS EM MEMÓRIA</footer>
      </main>
    </div>
  );
}