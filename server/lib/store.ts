// Tiny in-memory artifact store for generated PDFs, so the client can download
// them from /api/pdf/:id. Bounded so a long-running demo can't leak memory.
// (Production swaps this for Firebase Storage — Docs/07 §3.)
interface StoredPdf {
  filename: string;
  content: Buffer;
}

const pdfs = new Map<string, StoredPdf>();
const order: string[] = [];
const MAX = 50;

export function putPdf(id: string, pdf: StoredPdf) {
  pdfs.set(id, pdf);
  order.push(id);
  while (order.length > MAX) {
    const evict = order.shift();
    if (evict) pdfs.delete(evict);
  }
}

export function getPdf(id: string): StoredPdf | undefined {
  return pdfs.get(id);
}

// Uploaded photos, served from /api/photo/:id (production → Firebase Storage).
interface StoredPhoto {
  mime: string;
  content: Buffer;
}
const photos = new Map<string, StoredPhoto>();
const photoOrder: string[] = [];

export function putPhoto(id: string, photo: StoredPhoto) {
  photos.set(id, photo);
  photoOrder.push(id);
  while (photoOrder.length > MAX) {
    const evict = photoOrder.shift();
    if (evict) photos.delete(evict);
  }
}

export function getPhoto(id: string): StoredPhoto | undefined {
  return photos.get(id);
}
