// src/Pages/modules/sales/components/BarcodeSearchBar.jsx
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useSales } from '../hooks/useSales';
import { useToast } from '../../../../Components/hooks/useToast';
import { isValidBarcode } from '../../../../Components/utils/validators';

const MAX_SEARCH_LENGTH = 20;

const BarcodeSearchBar = () => {
  const [search, setSearch] = useState('');
  const { findByBarcode } = useSales();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleChange = useCallback((e) => {
    setSearch(e.target.value.slice(0, MAX_SEARCH_LENGTH).toUpperCase());
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const query = search.trim();
      if (!query || !isValidBarcode(query)) {
        showToast('Enter a valid barcode', 'warning');
        return;
      }
      const found = findByBarcode(query);
      if (!found) {
        showToast('Customer not found', 'error');
        return;
      }
      setSearch('');
      navigate(`/app/customers/${encodeURIComponent(found.barcode)}`);
    },
    [search, findByBarcode, navigate, showToast]
  );

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center" role="search">
      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
        <Search size={16} />
      </span>
      <input
        type="text"
        aria-label="Search by barcode"
        placeholder="Search by customer barcode..."
        maxLength={MAX_SEARCH_LENGTH}
        className="w-full border border-slate-200 bg-slate-50 rounded-lg py-2 pl-10 pr-4 focus:ring-1 focus:ring-emerald-500 outline-none text-sm transition-all"
        value={search}
        onChange={handleChange}
      />
    </form>
  );
};

export default BarcodeSearchBar;