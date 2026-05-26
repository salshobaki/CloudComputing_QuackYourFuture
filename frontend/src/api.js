import { supabase } from './lib/supabase';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const authHeader = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};

  const res  = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...authHeader, ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function getProfile() {
  return request('/get-profile');
}

export function saveProfile(payload) {
  return request('/save-profile', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
}

export async function uploadCV(file) {
  const form = new FormData();
  form.append('file', file);
  return request('/upload-cv', { method: 'POST', body: form });
}

export async function tailorCV(profileKey, jobDescription) {
  return request('/tailor-cv', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ profileKey, jobDescription }),
  });
}

export async function generateCV(jobDescription) {
  const profileKey = localStorage.getItem('qyf_profileKey') || 'default-user/profile.json';
  const data = await tailorCV(profileKey, jobDescription);
  return {
    score:         data.fitScore,
    justification: data.justification,
    downloadUrl:   data.downloadUrl,
  };
}

export function getHistory() {
  return request('/get-history');
}
