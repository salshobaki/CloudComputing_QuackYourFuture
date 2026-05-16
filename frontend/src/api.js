const BASE_URL = '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function getProfile() {
  return request('/api/profile/data');
}

export function saveProfile(profileData) {
  return request('/api/profile', {
    method: 'POST',
    body: JSON.stringify(profileData),
  });
}

export async function generateCV(jobDescription) {
  const data = await request('/api/generate', {
    method: 'POST',
    body: JSON.stringify({ jobDescription }),
  });
  // Normalise Lambda field names to what the UI expects
  return {
    score:         data.fitScore,
    justification: data.fitJustification,
    downloadUrl:   data.downloadUrl,
  };
}

export function getHistory() {
  return request('/api/history');
}
