const API_BASE = '/api';

async function request(path, userId, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      'X-User-Id': userId,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || 'Não foi possível concluir a operação.');
  }

  return response;
}

export async function listDocuments(userId) {
  const response = await request('/documents', userId);
  const body = await response.json();
  return body.documents;
}

export async function uploadDocument(userId, file) {
  const body = new FormData();
  body.append('file', file);
  const response = await request('/upload', userId, {
    method: 'POST',
    body,
  });
  return (await response.json()).document;
}

export async function downloadDocument(userId, document) {
  const response = await request(
    `/documents/${encodeURIComponent(document.id)}/download`,
    userId
  );
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = document.originalName;
  link.hidden = true;
  window.document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}