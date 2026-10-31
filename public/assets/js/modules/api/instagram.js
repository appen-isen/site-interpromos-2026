import { state } from '../state.js';
import { getAuthHeaders } from '../utils.js';
import { handleUnauthorized } from '../auth.js';
import { safeJson } from './base.js';
import { fetchAdminMedia, putToSignedUrl } from './gallery.js';
import { fetchInitialState } from './state.js';

// Ajoute le post ou le reel collé dans le formulaire de l'Espace BDS
export async function addInstagramPost() {
  const f = state.igForm;
  f.error = '';
  f.success = '';
  if (!f.url.trim()) {
    f.error = "Collez le lien d'un post ou d'un reel Instagram.";
    return;
  }
  f.loading = true;
  try {
    const res = await fetch('/api/instagram', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ url: f.url.trim() })
    });
    if (res.status === 401) return handleUnauthorized();
    const data = await safeJson(res);
    if (!res.ok || !Array.isArray(data)) {
      f.error = data.error || "Le post n'a pas pu être ajouté.";
      return;
    }
    state.instagramPosts = data;
    f.url = '';
    f.success = 'Post ajouté : il est visible sur le site.';
  } catch (err) {
    f.error = 'Impossible de joindre le serveur.';
  } finally {
    f.loading = false;
  }
}

// Retire un post du site (il reste en ligne sur Instagram)
export async function deleteInstagramPost(id) {
  const f = state.igForm;
  f.error = '';
  f.success = '';
  try {
    const res = await fetch(`/api/instagram/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    if (res.status === 401) return handleUnauthorized();
    const data = await safeJson(res);
    if (!res.ok || !Array.isArray(data)) {
      f.error = data.error || "Le post n'a pas pu être retiré.";
      return;
    }
    state.instagramPosts = data;
    f.success = 'Post retiré du site.';
  } catch (err) {
    f.error = 'Impossible de joindre le serveur.';
  }
}

const VIDEO_TYPES = /^video\/(mp4|webm|quicktime)$/;

async function igRequest(url, options) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    handleUnauthorized();
    return null;
  }
  const data = await safeJson(res);
  if (!res.ok || data._nonJson) throw new Error(data.error || 'Une erreur est survenue. Réessayez dans un instant.');
  return data;
}

/**
 * Joint une vidéo à un post : elle sera lue en boucle, sans le son, à la place du lecteur Instagram.
 * Production : envoi direct vers Supabase (URL signée) ; développement : envoi via l'API.
 */
export async function uploadInstagramVideo(id, file, onProgress) {
  const f = state.igForm;
  f.error = '';
  f.success = '';
  if (!file) return;
  if (!state.uploadConfig) await fetchAdminMedia();
  const maxBytes = state.uploadConfig?.maxBytes || 200 * 1024 * 1024;
  if (!VIDEO_TYPES.test(file.type || '')) {
    f.error = `${file.name} : joignez une vidéo MP4, WEBM ou MOV.`;
    return;
  }
  if (file.size > maxBytes) {
    f.error = `${file.name} : fichier trop volumineux (${Math.round(maxBytes / 1024 / 1024)} Mo max).`;
    return;
  }

  f.uploading = { id, percent: 0 };
  onProgress?.();
  try {
    let list;
    if (state.uploadConfig?.mode === 'direct') {
      const signed = await igRequest('/api/media/upload-url', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ type: file.type, size: file.size })
      });
      if (!signed) return;
      let lastPaint = 0;
      await putToSignedUrl(signed.uploadUrl, file, percent => {
        f.uploading = { id, percent };
        if (Date.now() - lastPaint > 250 || percent === 100) {
          lastPaint = Date.now();
          onProgress?.();
        }
      });
      list = await igRequest(`/api/instagram/${id}/video/complete`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ objectPath: signed.objectPath })
      });
    } else {
      list = await igRequest(`/api/instagram/${id}/video`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': file.type }),
        body: file
      });
    }
    if (!Array.isArray(list)) return;
    state.instagramPosts = list;
    f.success = 'Vidéo jointe : elle est lue en boucle sur le site.';
  } catch (err) {
    f.error = `Vidéo non envoyée : ${err.message}`;
  } finally {
    f.uploading = null;
  }
}

// Retire la vidéo jointe : le site revient au lecteur Instagram pour ce post
export async function deleteInstagramVideo(id) {
  const f = state.igForm;
  f.error = '';
  f.success = '';
  try {
    const list = await igRequest(`/api/instagram/${id}/video`, { method: 'DELETE', headers: getAuthHeaders() });
    if (!Array.isArray(list)) return;
    state.instagramPosts = list;
    f.success = 'Vidéo retirée.';
  } catch (err) {
    f.error = err.message;
  }
}

// Met la vidéo jointe d'un post en tête de l'accueil (on = false : l'en retire)
export async function setInstagramHero(id, on) {
  const f = state.igForm;
  f.error = '';
  f.success = '';
  try {
    const list = await igRequest(`/api/instagram/${id}/hero`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ on })
    });
    if (!Array.isArray(list)) return;
    state.instagramPosts = list;
    // L'en-tête de l'accueil (slots.hero) et l'onglet Galerie changent aussi
    await fetchInitialState();
    if (state.uploadConfig) await fetchAdminMedia();
    f.success = on ? "Vidéo affichée en tête de l'accueil." : "Vidéo retirée de l'accueil.";
  } catch (err) {
    f.error = err.message;
  }
}
