// Espace BDS : galerie (médias, albums), Instagram et import CSV
import { state, PROMOS, resetAlbumForm } from '../state.js';
import {
  toggleAlbumVisibility,
  uploadGalleryFiles,
  updateMedia,
  deleteMedia,
  setMediaSlot,
  submitAlbumForm,
  deleteAlbum,
  submitImportCSV,
  addInstagramPost,
  deleteInstagramPost,
  uploadInstagramVideo,
  deleteInstagramVideo,
  setInstagramHero
} from '../api/index.js';
import { track } from './helpers.js';

// Lit le fichier CSV choisi ; la promo est devinée d'après son nom (« A3_basket.csv »)
function readImportFile(file, render) {
  state.importFileName = file.name;
  const promoMatch = file.name.toUpperCase().match(/\b(A[1-5])\b/);
  if (promoMatch && PROMOS.includes(promoMatch[1])) state.importPromo = promoMatch[1];
  const reader = new FileReader();
  reader.onload = ev => {
    state.importCsvContent = String(ev.target?.result || '');
    state.importError = '';
    state.importSuccess = '';
    render();
  };
  reader.readAsText(file, 'utf-8');
}

export const clickActions = {
  // Médias
  'delete-media': async ({ btn, render }) => {
    if (!confirm('Supprimer définitivement ce média ?')) return;
    await deleteMedia(btn.dataset.id);
    render();
  },
  'toggle-media-big': async ({ btn, render }) => {
    await updateMedia(btn.dataset.id, { big: btn.dataset.big !== 'true' });
    render();
  },
  'set-media-slot': async ({ btn, render }) => {
    await setMediaSlot(btn.dataset.slot, btn.dataset.id || null);
    render();
  },
  'dismiss-media-msg': ({ render }) => {
    state.mediaError = '';
    state.mediaSuccess = '';
    render();
  },

  // Albums
  'toggle-album': async ({ btn, render }) => {
    await toggleAlbumVisibility(btn.dataset.name);
    render();
  },
  'submit-album': async ({ render }) => {
    await submitAlbumForm();
    render();
  },
  'edit-album': ({ btn, render }) => {
    const album = state.albums.find(a => a.id === btn.dataset.id);
    if (!album) return;
    state.albumForm = {
      editingId: album.id,
      name: album.name,
      start: album.start || '',
      end: album.end || '',
      published: album.published,
      error: ''
    };
    render();
    document.querySelector('[data-field="albumForm-name"]')?.focus();
  },
  'cancel-album-edit': ({ render }) => {
    resetAlbumForm();
    render();
  },
  'delete-album': async ({ btn, render }) => {
    if (!confirm(`Supprimer l'album « ${btn.dataset.name} » ?`)) return;
    await deleteAlbum(btn.dataset.id);
    render();
  },

  // Instagram
  'add-ig-post': ({ render }) => track(addInstagramPost(), render),
  'delete-ig-post': async ({ btn, render }) => {
    if (!confirm('Retirer ce post du site ? Il reste publié sur Instagram.')) return;
    await deleteInstagramPost(btn.dataset.id);
    render();
  },
  'delete-ig-video': async ({ btn, render }) => {
    if (!confirm('Retirer la vidéo ? Le site affichera de nouveau le lecteur Instagram pour ce post.')) return;
    await deleteInstagramVideo(btn.dataset.id);
    render();
  },
  'ig-hero': async ({ btn, render }) => {
    await setInstagramHero(btn.dataset.id, btn.dataset.on === 'true');
    render();
  },

  // Import CSV
  'import-csv': ({ render }) => track(submitImportCSV(), render)
};

export const changeFields = {
  igVideo: ({ target, render }) => track(uploadInstagramVideo(target.dataset.id, target.files?.[0], render), render),
  mediaFiles: async ({ target, render }) => {
    const files = Array.from(target.files || []);
    target.value = '';
    if (files.length === 0) return;
    await uploadGalleryFiles(files, render);
    render();
  },
  mediaAlbum: ({ target }) => {
    state.mediaAlbum = target.value;
  },
  mediaCaption: async ({ target, render }) => {
    await updateMedia(target.dataset.id, { caption: target.value });
    render();
  },
  mediaMoveAlbum: async ({ target, render }) => {
    await updateMedia(target.dataset.id, { album: target.value });
    render();
  },
  importCsvFile: ({ target, render }) => {
    const file = target.files?.[0];
    if (file) readImportFile(file, render);
  }
};

export const inputFields = {
  'igForm-url': ({ target }) => {
    state.igForm.url = target.value;
    state.igForm.error = '';
    state.igForm.success = '';
  },
  importPromo: ({ target }) => {
    state.importPromo = target.value;
  },
  importCsvContent: ({ target }) => {
    state.importCsvContent = target.value;
    if (state.importError) {
      state.importError = '';
      target.style.borderColor = 'var(--line)';
    }
  }
};

export const inputPrefixes = [
  ['albumForm-', ({ target, field }) => {
    const key = field.replace('albumForm-', '');
    state.albumForm[key] = target.type === 'checkbox' ? target.checked : target.value;
    state.albumForm.error = '';
  }]
];
