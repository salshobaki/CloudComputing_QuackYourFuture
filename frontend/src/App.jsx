import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import GeneratePage from './pages/GeneratePage';
import HistoryPage from './pages/HistoryPage';

function Layout() {
  const location = useLocation();
  const showNav = location.pathname !== '/';

  return (
    <div className="min-h-screen bg-amber-50 text-gray-900">
      {showNav && <Navbar />}
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/generate" element={<GeneratePage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
