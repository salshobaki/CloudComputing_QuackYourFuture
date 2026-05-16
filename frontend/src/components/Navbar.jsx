import React from 'react';
import { NavLink } from 'react-router-dom';

function DuckLogo() {
  return (
    <svg className="w-9 h-7" viewBox="0 0 46 34" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="19" cy="27" rx="17" ry="7" fill="#FFD700" />
      <ellipse cx="13" cy="25" rx="9" ry="5" fill="#FFBA00" transform="rotate(-5 13 25)" />
      <circle cx="30" cy="13" r="11" fill="#FFD700" />
      <path d="M39 11 L46 9 L46 15 Z" fill="#FF8C00" />
      <circle cx="34" cy="9" r="3" fill="#1A1A2E" />
      <circle cx="35" cy="8" r="1" fill="white" />
      <path d="M4 22 Q1 17 5 14" stroke="#FFD700" strokeWidth="5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function Navbar() {
  const linkClass = ({ isActive }) =>
    `text-sm font-semibold px-4 py-2 rounded-lg transition-all ${
      isActive
        ? 'bg-yellow-400 text-blue-900 shadow-sm'
        : 'text-yellow-100 hover:text-yellow-400 hover:bg-blue-700'
    }`;

  return (
    <nav className="bg-blue-900 border-b border-blue-800 shadow-lg">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <DuckLogo />
          <span className="text-lg font-extrabold text-yellow-400 tracking-tight">
            QuackYourFuture
          </span>
        </div>
        <div className="flex items-center gap-1">
          <NavLink to="/profile" className={linkClass}>Profile</NavLink>
          <NavLink to="/generate" className={linkClass}>Generate</NavLink>
          <NavLink to="/history" className={linkClass}>History</NavLink>
        </div>
      </div>
    </nav>
  );
}
