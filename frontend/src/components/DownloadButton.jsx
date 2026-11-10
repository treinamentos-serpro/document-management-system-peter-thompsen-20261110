import { useState } from 'react';

export default function DownloadButton({ document, onDownload }) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function download() {
    setIsDownloading(true);
    try {
      await onDownload(document);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <button
      type="button"
      className="download-button"
      onClick={download}
      disabled={isDownloading}
    >
      {isDownloading ? 'Baixando...' : 'Baixar'}
    </button>
  );
}