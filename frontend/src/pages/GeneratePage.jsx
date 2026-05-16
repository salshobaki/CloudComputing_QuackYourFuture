import React, { useState } from 'react';
import { generateCV } from '../api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score) {
  if (score > 70) return { text: 'text-emerald-500', ring: 'border-emerald-400', bg: 'bg-emerald-50' };
  if (score >= 40) return { text: 'text-amber-500',  ring: 'border-amber-400',  bg: 'bg-amber-50'  };
  return              { text: 'text-red-500',         ring: 'border-red-400',    bg: 'bg-red-50'    };
}

function scoreLabel(score) {
  if (score > 70) return 'Strong Match';
  if (score >= 40) return 'Partial Match';
  return 'Weak Match';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mt-10 space-y-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="h-32 bg-gray-200 rounded-xl" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-4 bg-gray-200 rounded w-2/5" />
    </div>
  );
}

function ScoreRing({ score }) {
  const { text, ring } = scoreColor(score);
  return (
    <div
      className={`w-36 h-36 rounded-full border-8 ${ring} flex flex-col items-center justify-center mx-auto`}
    >
      <span className={`text-4xl font-extrabold leading-none ${text}`}>{score}%</span>
      <span className="text-xs font-medium text-gray-400 mt-1">Fit Score</span>
    </div>
  );
}

function ResultCard({ result, onReset }) {
  const { text: scoreText, bg } = scoreColor(result.score);
  const label = scoreLabel(result.score);

  return (
    <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all">
      {/* Score header */}
      <div className={`${bg} px-6 py-8 flex flex-col items-center gap-3`}>
        <ScoreRing score={result.score} />
        <span className={`text-sm font-semibold ${scoreText} uppercase tracking-wide`}>
          {label}
        </span>
      </div>

      {/* Body */}
      <div className="px-6 py-6 space-y-6">
        <p className="text-center text-gray-600 text-sm leading-relaxed">
          {result.justification}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={result.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11" />
            </svg>
            Download CV (.docx)
          </a>

          <button
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 font-medium px-6 py-2.5 rounded-xl text-sm border border-gray-200 hover:border-gray-300 transition-colors"
          >
            Try Another Job
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GeneratePage() {
  const [jobDescription, setJobDescription] = useState('');
  const [status, setStatus]   = useState('idle');   // idle | loading | success | error
  const [result, setResult]   = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jobDescription.trim()) return;

    setStatus('loading');
    setResult(null);
    setErrorMsg('');

    try {
      const data = await generateCV(jobDescription);
      setResult(data);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setJobDescription('');
    setResult(null);
    setErrorMsg('');
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Generate CV</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Paste a job description and we'll tailor your CV to match.
        </p>
      </div>

      {/* Input section — collapses when success */}
      <div
        className={`transition-all duration-500 overflow-hidden ${
          status === 'success' ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'
        }`}
      >
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            disabled={status === 'loading'}
            rows={10}
            placeholder="Paste the job description here..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:bg-gray-50 disabled:text-gray-400"
          />

          {/* Error message */}
          {status === 'error' && (
            <p className="mt-3 text-sm text-red-500 flex items-center gap-1.5">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'loading' || !jobDescription.trim()}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm"
          >
            {status === 'loading' ? (
              <>
                <Spinner />
                Tailoring your CV...
              </>
            ) : (
              'Generate CV'
            )}
          </button>
        </form>

        {status === 'loading' && <LoadingSkeleton />}
      </div>

      {/* Result card */}
      {status === 'success' && result && (
        <ResultCard result={result} onReset={handleReset} />
      )}
    </main>
  );
}
