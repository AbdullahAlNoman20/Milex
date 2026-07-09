// src/Components/Shared/Unauthorized.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const Unauthorized = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
    <ShieldAlert size={48} className="text-red-400 mb-4" />
    <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
    <p className="text-sm text-slate-500 mb-6 max-w-sm">
      You do not have permission to view this resource. Contact your Line Manager or Admin if you believe this is a mistake.
    </p>
    <Link to="/app" className="text-emerald-600 font-semibold text-sm hover:underline">
      Return to Dashboard
    </Link>
  </div>
);

export default Unauthorized;