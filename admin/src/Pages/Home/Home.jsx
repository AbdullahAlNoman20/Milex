// src/Pages/Home/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => (
  <main className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
    <h1 className="text-4xl font-black text-slate-800 mb-4 italic uppercase tracking-tight">
      Milex Customer Onboarding
    </h1>
    <p className="text-slate-500 max-w-lg mb-8">
      Streamlined recommendation, rate approval, and account onboarding workflow for the Sales
      department.
    </p>
    <Link
      to="/login"
      className="bg-emerald-700 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-emerald-800 transition"
    >
      Enter System
    </Link>
  </main>
);

export default Home;