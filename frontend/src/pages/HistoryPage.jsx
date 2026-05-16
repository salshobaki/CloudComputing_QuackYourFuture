import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory } from '../api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatSize(bytes) {
  if (bytes == null) return '';
  const kb = bytes / 1024;
  return kb < 1 ? `${bytes} B` : `${kb.toFixed(1)} KB`;
}

function stripPrefix(key) {
  const parts = key.split('/');
  return parts[parts.length - 1] || key;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border-2 border-yellow-100 shadow-sm p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-yellow-100 rounded w-2/5" />
          <div className="h-3 bg-yellow-100 rounded w-1/4" />
        </div>
        <div className="h-8 w-8 bg-yellow-100 rounded-lg ml-4 shrink-0" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="h-3 bg-yellow-100 rounded w-1/3" />
        <div className="h-8 w-28 bg-yellow-100 rounded-xl" />
      </div>
    </div>
  );
}

// ─── History card ─────────────────────────────────────────────────────────────

function HistoryCard({ item }) {
  const filename = stripPrefix(item.key);

  return (
    <div className="group bg-white rounded-2xl border-2 border-yellow-100 shadow-sm hover:shadow-md hover:border-yellow-300 hover:-translate-y-0.5 transition-all duration-200 p-5">
      <div className="flex items-start justify-between gap-4">
        {/* Filename */}
        <div className="min-w-0">
          <h3 className="text-base font-bold text-blue-900 truncate">{filename}</h3>
          <p className="text-sm text-blue-300 mt-0.5">{formatSize(item.size)}</p>
        </div>

        {/* File icon */}
        <span className="shrink-0 w-10 h-10 rounded-xl bg-yellow-100 border border-yellow-200 flex items-center justify-center text-lg">
          🦆
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        {/* Date */}
        <span className="flex items-center gap-1.5 text-xs text-blue-300 font-medium">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate(item.lastModified)}
        </span>

        {/* Download */}
        <button
          disabled
          title="Download not yet available"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-300 border-2 border-blue-100 px-3 py-1.5 rounded-lg cursor-not-allowed opacity-60"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11" />
          </svg>
          Download CV
        </button>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {/* Duck illustration */}
      <svg className="w-28 h-24 mb-4 animate-duck-bob" viewBox="0 0 140 110" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="62" cy="87" rx="52" ry="23" fill="#FFD700" opacity="0.9"/>
        <ellipse cx="62" cy="94" rx="42" ry="14" fill="#FFBA00" opacity="0.7"/>
        <ellipse cx="42" cy="83" rx="26" ry="15" fill="#FFC200" transform="rotate(-8 42 83)" opacity="0.8"/>
        <circle cx="100" cy="52" r="28" fill="#FFD700"/>
        <path d="M125 48 L142 43 L142 57 Z" fill="#FF8C00"/>
        <circle cx="110" cy="42" r="7" fill="#1A1A2E"/>
        <circle cx="112" cy="40" r="2.5" fill="white"/>
        <ellipse cx="100" cy="75" rx="16" ry="20" fill="#FFD700"/>
        <path d="M12 72 Q4 60 14 53" stroke="#FFD700" strokeWidth="10" fill="none" strokeLinecap="round"/>
        <path d="M14 99 Q35 95 58 99 Q82 103 106 99 Q130 95 138 99" stroke="#93C5FD" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8"/>
      </svg>
      <p className="text-blue-900 font-extrabold text-lg">No quacks yet! 🦆</p>
      <p className="text-blue-400 text-sm mt-1 font-medium">
        Waddle over to Generate to hatch your first CV!
      </p>
      <button
        onClick={() => navigate('/generate')}
        className="mt-6 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-extrabold px-6 py-3 rounded-xl text-sm transition-all shadow-lg hover:shadow-yellow-400/30"
      >
        🐣 Hatch a CV
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    getHistory()
      .then(({ history: items }) => setHistory(items))
      .catch((err) => setFetchError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-blue-900 flex items-center gap-2">
          <span>📜</span> Quack History
        </h1>
        <p className="text-blue-400 mt-1 text-sm font-medium">Your previously hatched CVs.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : fetchError ? (
        <p className="text-sm text-red-500 flex items-center gap-1.5 mt-4">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          {fetchError}
        </p>
      ) : history.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {history.map((item) => <HistoryCard key={item.key} item={item} />)}
        </div>
      )}
    </main>
  );
}
