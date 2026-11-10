import DownloadButton from './DownloadButton.jsx';
import { formatBytes, formatDate } from '../utils/format.js';

export default function DocumentList({ documents, isLoading, userId, onDownload }) {
  return (
    <section className="documents-section" aria-labelledby="documents-title">
      <div className="list-heading">
        <div className="section-heading">
          <div className="step-number">02</div>
          <div>
            <h2 id="documents-title">Sua biblioteca</h2>
            <p>{documents.length} {documents.length === 1 ? 'documento' : 'documentos'}</p>
          </div>
        </div>
        <span className="owner-label">{userId}</span>
      </div>

      <div className="document-table-wrap">
        <table className="document-table">
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Tamanho</th>
              <th scope="col">Enviado em</th>
              <th scope="col"><span className="visually-hidden">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className="table-message" colSpan="4">Carregando documentos...</td></tr>
            ) : documents.length === 0 ? (
              <tr><td className="table-message empty-message" colSpan="4">Sua biblioteca está vazia.</td></tr>
            ) : documents.map((document) => (
              <tr key={document.id}>
                <td>
                  <div className="document-name">
                    <span className="document-icon" aria-hidden="true">DOC</span>
                    <span>{document.originalName}</span>
                  </div>
                </td>
                <td className="secondary-cell">{formatBytes(document.size)}</td>
                <td className="secondary-cell">{formatDate(document.uploadedAt)}</td>
                <td className="action-cell">
                  <DownloadButton document={document} onDownload={onDownload} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}