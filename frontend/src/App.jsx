import { useEffect, useRef, useState } from 'react';
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
  const latestListRequest = useRef(0);
  const currentUserId = useRef(userId);
  currentUserId.current = userId;

  useEffect(() => {
    const requestId = ++latestListRequest.current;
    setIsLoading(true);
    listDocuments(userId)
      .then((items) => {
        if (requestId === latestListRequest.current) setDocuments(items);
      })
      .catch((error) => {
        if (requestId === latestListRequest.current) {
          setMessage({ type: 'error', text: error.message });
        }
      })
      .finally(() => {
        if (requestId === latestListRequest.current) setIsLoading(false);
      });

    return () => {
      latestListRequest.current += 1;
    };
  }, [userId]);

  async function refreshDocuments() {
    const requestId = ++latestListRequest.current;
    const requestedUserId = userId;
    setMessage(null);
    setIsLoading(true);
    try {
      const items = await listDocuments(requestedUserId);
      if (requestId === latestListRequest.current) setDocuments(items);
    } catch (error) {
      if (requestId === latestListRequest.current) {
        setMessage({ type: 'error', text: error.message });
      }
    } finally {
      if (requestId === latestListRequest.current) setIsLoading(false);
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
    setDocuments([]);
    setUserId(nextUserId);
  }

  async function handleUpload(file) {
    const uploadedForUser = userId;
    setMessage(null);
    try {
      await uploadDocument(uploadedForUser, file);
      if (currentUserId.current !== uploadedForUser) return true;

      setMessage({ type: 'success', text: 'Documento enviado.' });
      const requestId = ++latestListRequest.current;
      setIsLoading(true);
      try {
        const items = await listDocuments(uploadedForUser);
        if (requestId === latestListRequest.current) setDocuments(items);
      } catch {
        if (
          requestId === latestListRequest.current
          && currentUserId.current === uploadedForUser
        ) {
          setMessage({
            type: 'success',
            text: 'Documento enviado. Não foi possível atualizar a lista; tente atualizá-la.',
          });
        }
      } finally {
        if (requestId === latestListRequest.current) setIsLoading(false);
      }
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

        {message && (
          <p
            className={`feedback app-feedback feedback-${message.type}`}
            role={message.type === 'error' ? 'alert' : 'status'}
          >
            {message.text}
          </p>
        )}
        <UploadComponent onUpload={handleUpload} />
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