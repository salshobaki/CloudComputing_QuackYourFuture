const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request(path, options = {}) {
  const res  = await fetch(`${BASE}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/**
 * Upload a CV file (PDF or DOCX).
 * Returns { profileKey } — store this and pass it to tailorCV.
 */
export async function uploadCV(file) {
  const form = new FormData();
  form.append('file', file);
  return request('/upload-cv', { method: 'POST', body: form });
}

/**
 * Tailor the CV for a job description.
 * Returns { fitScore, justification, downloadUrl }.
 */
export async function tailorCV(profileKey, jobDescription) {
  return request('/tailor-cv', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ profileKey, jobDescription }),
  });
}

// ─── localStorage-backed profile (no dedicated Lambda endpoint needed) ────────

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

// ─── generateCV: thin wrapper kept for GeneratePage compatibility ─────────────

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
