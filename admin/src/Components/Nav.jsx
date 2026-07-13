// src/Components/Nav.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

const Nav = () => {
  const { isAuthenticated } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <Link to="/" className="flex items-center">
        <img src="/log.jpeg" alt="MILEX" className="h-10 w-auto object-contain" />
      </Link>
      <nav className="flex items-center gap-4">
        {isAuthenticated ? (
          <Link
            to="/app"
            className="text-sm font-bold text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg hover:bg-emerald-50 transition"
          >
            Go to Dashboard
          </Link>
        ) : (
          <Link
            to="/login"
            className="text-sm font-bold text-white bg-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-800 transition"
          >
            Login
          </Link>
        )}
      </nav>
    </header>
  );
};

export default Nav;