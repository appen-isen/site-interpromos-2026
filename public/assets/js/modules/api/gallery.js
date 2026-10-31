import { state, ALBUMS, setAlbums, resetAlbumForm } from '../state.js';
import { getAuthHeaders } from '../utils.js';
import { handleUnauthorized } from '../auth.js';
import { safeJson } from './base.js';

const ACCEPTED_TYPES = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime))$/;

function applyAdminGallery(data) {
  if (Array.isArray(data.photos)) state.adminPhotos = data.photos;
  if (Array.isArray(data.albums)) setAlbums(data.albums);
  if (data.pub) state.pub = data.pub;
  if (data.slots) state.adminSlots = data.slots;
  if (data.upload) state.uploadConfig = data.upload;
}

// Envoi direct vers Supabase Storage via l'URL signée, avec suivi de progression
export function putToSignedUrl(url, file, onPercent) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = e => e.lengthComputable && onPercent(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300
      ? resolve()
      : reject(new Error(xhr.status === 413 || xhr.status === 400
        ? 'fichier refusé, il est sans doute trop lourd. Essayez une version plus légère.'
        : "l'envoi a échoué. Réessayez dans un instant.")));
    xhr.onerror = () => reject(new Error("la connexion a été interrompue pendant l'envoi. Réessayez."));
    xhr.send(file);
  });
}

async function uploadDirect(file, album, onPercent) {
  const jsonHeaders = getAuthHeaders({ 'Content-Type': 'application/json' });
  const signed = await mediaRequest('/api/media/upload-url', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ type: file.type, size: file.size })
  });
  if (!signed) return null;
  await putToSignedUrl(signed.uploadUrl, file, onPercent);
  return mediaRequest('/api/media/complete', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ objectPath: signed.objectPath, fileName: file.name, album })
  });
}

function uploadThroughApi(file, album) {
  return mediaRequest('/api/media/upload', {
    method: 'POST',
    headers: getAuthHeaders({
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
      'X-Album': encodeURIComponent(album)
    }),
    body: file
  });
}

async function mediaRequest(url, options) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    handleUnauthorized();
    return null;
  }
  const data = await safeJson(res);
  if (!res.ok || data._nonJson) {
    throw new Error(data.error || 'Une erreur est survenue. Réessayez dans un instant.');
  }
  return data;
}

// Recharge la galerie publique après une modification côté admin
async function refreshPublicGallery() {
  try {
    const res = await fetch('/api/gallery');
    const data = await safeJson(res);
    if (res.ok && !data._nonJson) {
      if (Array.isArray(data.photos)) state.photos = data.photos;
      if (Array.isArray(data.albums)) setAlbums(data.albums);
      if (data.pub) state.pub = data.pub;
      if (data.slots) state.slots = data.slots;
    }
  } catch (e) {}
}

export async function fetchAdminMedia() {
  try {
    const data = await mediaRequest('/api/media', { headers: getAuthHeaders() });
    if (data) applyAdminGallery(data);
  } catch (err) {
    state.mediaError = err.message;
  }
}

export async function toggleAlbumVisibility(name) {
  try {
    const data = await mediaRequest('/api/gallery/albums', {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name })
    });
    if (data?.pub) state.pub = data.pub;
    await refreshPublicGallery();
  } catch (err) {
    state.mediaError = err.message;
  }
}

/**
 * Téléverse les fichiers sélectionnés un par un (corps brut + métadonnées en en-têtes)
 */
export async function uploadGalleryFiles(files, onProgress) {
  const album = state.mediaAlbum || ALBUMS[0] || '';
  const list = Array.from(files || []);
  const errors = [];
  let done = 0;

  state.mediaError = '';
  state.mediaSuccess = '';
  const direct = state.uploadConfig?.mode === 'direct';
  const maxBytes = state.uploadConfig?.maxBytes || 200 * 1024 * 1024;
  state.mediaUploading = { done: 0, total: list.length, percent: 0 };
  onProgress?.();

  for (const file of list) {
    if (file.size > maxBytes) {
      errors.push(`${file.name} : fichier trop volumineux (${Math.round(maxBytes / 1024 / 1024)} Mo max).`);
    } else if (!ACCEPTED_TYPES.test(file.type || '')) {
      errors.push(`${file.name} : format non pris en charge.`);
    } else {
      try {
        let lastPaint = 0;
        const onPercent = percent => {
          state.mediaUploading = { ...state.mediaUploading, percent };
          // Réaffichage limité pour ne pas saturer l'interface pendant un gros envoi
          if (Date.now() - lastPaint > 250 || percent === 100) {
            lastPaint = Date.now();
            onProgress?.();
          }
        };
        const data = direct ? await uploadDirect(file, album, onPercent) : await uploadThroughApi(file, album);
        if (!data) break; // session expirée
        applyAdminGallery(data);
        done++;
      } catch (err) {
        errors.push(`${file.name} : ${err.message}`);
      }
    }
    state.mediaUploading = { done: done + errors.length, total: list.length, percent: 0 };
    onProgress?.();
  }

  state.mediaUploading = null;
  state.mediaError = errors.join(' ');
  if (done > 0) {
    state.mediaSuccess = `${done} média(s) ajouté(s) à « ${album} ».`;
    await refreshPublicGallery();
  }
}

export async function updateMedia(id, changes) {
  try {
    const data = await mediaRequest(`/api/media/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(changes)
    });
    if (data) applyAdminGallery(data);
    await refreshPublicGallery();
  } catch (err) {
    state.mediaError = err.message;
  }
}

export async function deleteMedia(id) {
  try {
    const data = await mediaRequest(`/api/media/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (data) applyAdminGallery(data);
    await refreshPublicGallery();
  } catch (err) {
    state.mediaError = err.message;
  }
}

export async function setMediaSlot(slot, mediaId) {
  try {
    const data = await mediaRequest(`/api/media/slots/${slot}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ mediaId })
    });
    if (data) applyAdminGallery(data);
    await refreshPublicGallery();
  } catch (err) {
    state.mediaError = err.message;
  }
}

/**
 * Crée ou modifie un album à partir de state.albumForm
 */
export async function submitAlbumForm() {
  const f = state.albumForm;
  if (!f.name.trim()) {
    f.error = "Donnez un nom à l'album.";
    return;
  }
  if (f.end && !f.start) {
    f.error = 'Indiquez une date de début.';
    return;
  }
  if (f.start && f.end && f.end < f.start) {
    f.error = 'La date de fin doit être postérieure à la date de début.';
    return;
  }
  const payload = { name: f.name.trim(), start: f.start || null, end: f.end || null, published: f.published };
  try {
    const data = await mediaRequest(f.editingId ? `/api/gallery/albums/${f.editingId}` : '/api/gallery/albums', {
      method: f.editingId ? 'PUT' : 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
    if (!data) return;
    applyAdminGallery(data);
    state.mediaSuccess = f.editingId ? `Album « ${payload.name} » modifié.` : `Album « ${payload.name} » créé.`;
    state.mediaError = '';
    if (!f.editingId) state.mediaAlbum = payload.name;
    resetAlbumForm();
    await refreshPublicGallery();
  } catch (err) {
    f.error = err.message;
  }
}

export async function deleteAlbum(id) {
  try {
    const data = await mediaRequest(`/api/gallery/albums/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (data) applyAdminGallery(data);
    if (state.albumForm.editingId === id) resetAlbumForm();
    await refreshPublicGallery();
  } catch (err) {
    state.mediaError = err.message;
  }
}
