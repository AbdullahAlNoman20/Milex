// src/Components/Footer.jsx
import React from 'react';

const Footer = () => (
  <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
    <div className="max-w-7xl mx-auto px-6 text-center text-xs text-slate-400">
      &copy; {new Date().getFullYear()} Milex Logistics. All rights reserved.
    </div>
  </footer>
);

export default Footer;