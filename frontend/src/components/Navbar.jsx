import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar() {
  const linkClass = ({ isActive }) =>
    `text-sm font-medium px-3 py-2 rounded-md transition-colors ${
      isActive
        ? 'bg-indigo-600 text-white'
        : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
    }`;

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <span className="text-lg font-bold text-indigo-600 tracking-tight">
          QuackYourFuture
        </span>
        <div className="flex items-center gap-1">
          <NavLink to="/profile" className={linkClass}>Profile</NavLink>
          <NavLink to="/generate" className={linkClass}>Generate</NavLink>
          <NavLink to="/history" className={linkClass}>History</NavLink>
        </div>
      </div>
    </nav>
  );
}
