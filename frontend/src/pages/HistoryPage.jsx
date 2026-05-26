import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function HistoryPage() {
  const navigate = useNavigate();

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-blue-900 flex items-center gap-2">
          <span>📜</span> Quack History
        </h1>
        <p className="text-blue-400 mt-1 text-sm font-medium">Your previously hatched CVs.</p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center">
        <svg className="w-28 h-24 mb-4" viewBox="0 0 140 110" xmlns="http://www.w3.org/2000/svg">
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
    </main>
  );
}
