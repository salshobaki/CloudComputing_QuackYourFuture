import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory } from '../api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreStyle(score) {
  if (score > 70) return { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' };
  if (score >= 40) return { badge: 'bg-amber-100  text-amber-700',   dot: 'bg-amber-500'  };
  return              { badge: 'bg-red-100    text-red-600',          dot: 'bg-red-500'    };
}

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
  // "default-user/some-file.docx" → "some-file.docx"
  const parts = key.split('/');
  return parts[parts.length - 1] || key;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 rounded w-2/5" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
        <div className="h-6 w-16 bg-gray-200 rounded-full ml-4 shrink-0" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-8 w-28 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

// ─── History card ─────────────────────────────────────────────────────────────

function HistoryCard({ item }) {
  const filename = stripPrefix(item.key);

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5">
      <div className="flex items-start justify-between gap-4">
        {/* Filename */}
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">{filename}</h3>
          <p className="text-sm text-gray-400 mt-0.5">{formatSize(item.size)}</p>
        </div>

        {/* File icon */}
        <span className="shrink-0 w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
          <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        {/* Date */}
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate(item.lastModified)}
        </span>

        {/* Download — disabled until pre-signed URL is available */}
        <button
          disabled
          title="Download not yet available"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg cursor-not-allowed opacity-60"
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
      <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6M4.5 19.5l1.06-1.06M19.5 4.5l-1.06 1.06M4.5 4.5l1.06 1.06M19.5 19.5l-1.06-1.06M12 3v1m0 16v1m9-9h-1M4 12H3" />
        </svg>
      </div>
      <p className="text-gray-600 font-medium">No generations yet.</p>
      <p className="text-gray-400 text-sm mt-1">
        Go to Generate to create your first CV.
      </p>
      <button
        onClick={() => navigate('/generate')}
        className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
      >
        Generate a CV
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
        <h1 className="text-3xl font-bold text-gray-900">History</h1>
        <p className="text-gray-500 mt-1 text-sm">Your previously generated CVs.</p>
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
