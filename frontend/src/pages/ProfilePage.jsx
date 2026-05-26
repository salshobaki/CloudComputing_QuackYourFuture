import React, { useRef, useState } from 'react';
import { uploadCV } from '../api';

const PROFILE_KEY = 'qyf_profileKey';

const inputCls =
  'rounded-xl border-2 border-blue-100 bg-blue-50/40 px-3 py-2 text-sm text-gray-800 ' +
  'focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition';

function Toast({ onDone }) {
  React.useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 right-6 bg-blue-900 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 z-50 border-2 border-yellow-400">
      <span className="text-yellow-400">🦆</span>
      CV uploaded and profile extracted!
    </div>
  );
}

export default function ProfilePage() {
  const fileRef               = useRef(null);
  const [file, setFile]       = useState(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus]   = useState('idle'); // idle | uploading | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [savedKey, setSavedKey] = useState(() => localStorage.getItem(PROFILE_KEY) || '');

  const accept = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setStatus('idle');
    setErrorMsg('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setStatus('uploading');
    setErrorMsg('');
    try {
      const { profileKey } = await uploadCV(file);
      localStorage.setItem(PROFILE_KEY, profileKey);
      setSavedKey(profileKey);
      setStatus('success');
      setFile(null);
    } catch (err) {
      setErrorMsg(err.message || 'Upload failed. Please try again.');
      setStatus('error');
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-blue-900 flex items-center gap-2">
          <span>🦆</span> Your Pond Profile
        </h1>
        <p className="text-blue-500 mt-1 text-sm font-medium">
          Upload your CV (PDF or DOCX) — we'll extract your profile automatically.
        </p>
      </div>

      {/* Already uploaded banner */}
      {savedKey && (
        <div className="mb-6 flex items-center gap-3 bg-emerald-50 border-2 border-emerald-200 rounded-2xl px-5 py-4">
          <span className="text-2xl">✅</span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-emerald-800">Profile ready</p>
            <p className="text-xs text-emerald-600 truncate font-mono mt-0.5">{savedKey}</p>
          </div>
          <button
            onClick={() => { setSavedKey(''); localStorage.removeItem(PROFILE_KEY); setStatus('idle'); }}
            className="ml-auto text-xs text-emerald-600 hover:text-emerald-900 font-semibold shrink-0"
          >
            Remove
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border-2 border-yellow-200 p-6">
        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 flex flex-col items-center gap-3 transition-colors
            ${dragging ? 'border-yellow-400 bg-yellow-50' : 'border-blue-200 bg-blue-50/30 hover:border-yellow-300 hover:bg-yellow-50/50'}`}
        >
          <span className="text-4xl">{file ? '📄' : '📁'}</span>
          {file ? (
            <p className="text-sm font-bold text-blue-800 text-center truncate max-w-full px-4">{file.name}</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-blue-700 text-center">
                Drag & drop your CV here, or click to browse
              </p>
              <p className="text-xs text-blue-400">PDF or DOCX · max 10 MB</p>
            </>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {status === 'error' && (
          <p className="mt-4 text-sm text-red-500 flex items-center gap-1.5">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={!file || status === 'uploading'}
          className="mt-5 w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 disabled:bg-yellow-200 disabled:cursor-not-allowed text-blue-900 font-extrabold py-3 rounded-xl text-sm transition-all shadow-lg hover:shadow-yellow-400/30"
        >
          {status === 'uploading' ? (
            <>
              <svg className="animate-spin h-4 w-4 text-blue-900" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Extracting profile...
            </>
          ) : '🦆 Upload & Extract Profile'}
        </button>
      </form>

      {status === 'success' && <Toast onDone={() => setStatus('idle')} />}
    </main>
  );
}
