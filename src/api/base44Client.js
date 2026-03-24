// Local store replacing @base44/sdk — no backend required
const SHOW_KEY = 'scl-show';
const MEDIA_KEY = 'scl-media';

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export const base44 = {
  entities: {
    Show: {
      list: async () => {
        const d = localStorage.getItem(SHOW_KEY);
        return d ? [JSON.parse(d)] : [];
      },
      create: async (data) => {
        const show = { ...data, id: generateId() };
        localStorage.setItem(SHOW_KEY, JSON.stringify(show));
        return show;
      },
      update: async (id, data) => {
        const show = { ...data, id };
        localStorage.setItem(SHOW_KEY, JSON.stringify(show));
        return show;
      },
      subscribe: (callback) => {
        const handler = (e) => {
          if (e.key === SHOW_KEY && e.newValue) {
            const show = JSON.parse(e.newValue);
            callback({ type: 'update', id: show.id, data: show });
          }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
      },
    },
    Media: {
      list: async () => {
        const d = localStorage.getItem(MEDIA_KEY);
        return d ? JSON.parse(d) : [];
      },
      create: async (data) => {
        const media = { ...data, id: generateId() };
        const list = JSON.parse(localStorage.getItem(MEDIA_KEY) || '[]');
        list.push(media);
        localStorage.setItem(MEDIA_KEY, JSON.stringify(list));
        return media;
      },
      update: async (id, data) => {
        const list = JSON.parse(localStorage.getItem(MEDIA_KEY) || '[]')
          .map(m => m.id === id ? { ...m, ...data } : m);
        localStorage.setItem(MEDIA_KEY, JSON.stringify(list));
      },
      delete: async (id) => {
        const list = JSON.parse(localStorage.getItem(MEDIA_KEY) || '[]')
          .filter(m => m.id !== id);
        localStorage.setItem(MEDIA_KEY, JSON.stringify(list));
      },
    },
  },
  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        const file_url = URL.createObjectURL(file);
        return { file_url };
      },
    },
  },
};
