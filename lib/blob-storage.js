import 'server-only';
import { put } from '@vercel/blob';

export async function storeResume(file, candidateId = 'pending') {
  if (!file || typeof file.arrayBuffer !== 'function' || !file.size) return null;
  const safeName = String(file.name || 'resume').replace(/[^a-zA-Z0-9._-]/g, '_');
  const blob = await put(`resumes/${candidateId}/${safeName}`, file, { access: 'private', addRandomSuffix: true });
  return { url: blob.url, pathname: blob.pathname, filename: safeName };
}
