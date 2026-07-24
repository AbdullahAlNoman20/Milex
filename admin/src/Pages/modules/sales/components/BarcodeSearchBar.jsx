// admin/src/Pages/modules/sales/components/BarcodeSearchBar.jsx — REPLACE ENTIRE FILE
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useSales } from '../hooks/useSales';
import { searchCustomers } from '../services/customerService';

const MAX_SEARCH_LENGTH = 40;
const DEBOUNCE_MS = 200;

const BarcodeSearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { setSelectedCustomer } = useSales();
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced, cancellable, server-side search — matches on account name,
  // customer barcode, and rate reference (comes back from the same query
  // since the backend already does an OR match across all three columns).
  const runSearch = useCallback((term, autoNavigateIfExact = false) => {
    clearTimeout(debounceRef.current);
    if (!term.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const items = await searchCustomers(term.trim());
        if (requestId !== requestIdRef.current) return;
        setResults(items);
        // A barcode scanner sends the full code and an Enter keystroke almost
        // instantly — if that exact barcode matches one customer, skip the
        // dropdown entirely and jump straight to their profile.
        if (autoNavigateIfExact) {
          const exact = items.find((c) => c.barcode.toLowerCase() === term.trim().toLowerCase());
          if (exact) openCustomerRef.current(exact);
        }
      } catch {
        if (requestId === requestIdRef.current) setResults([]);
      } finally {
        if (requestId === requestIdRef.current) setIsSearching(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value.slice(0, MAX_SEARCH_LENGTH);
    setQuery(val);
    setIsOpen(true);
    runSearch(val, false);
  };

  const openCustomer = useCallback(
    (c) => {
      setSelectedCustomer(c);
      setQuery('');
      setResults([]);
      setIsOpen(false);
      navigate(`/app/customers/${encodeURIComponent(c.barcode)}`);
    },
    [navigate, setSelectedCustomer]
  );

  // Keeps a stable reference to the latest openCustomer for the debounced
  // callback above (which is created once and shouldn't be re-created on
  // every render just because openCustomer's identity changes).
  const openCustomerRef = useRef(openCustomer);
  useEffect(() => {
    openCustomerRef.current = openCustomer;
  }, [openCustomer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    // Enter key (typed manually, or sent automatically by a barcode
    // scanner) — search immediately and auto-navigate on an exact match.
    runSearch(query, true);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    requestIdRef.current++;
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <form onSubmit={handleSubmit} className="relative flex items-center" role="search">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <Search size={16} />
        </span>
        <input
          type="text"
          aria-label="Search by customer name, barcode, or reference"
          placeholder="Search by customer name, barcode, or reference..."
          maxLength={MAX_SEARCH_LENGTH}
          className="w-full border border-slate-200 bg-slate-50 rounded-lg py-2 pl-10 pr-9 focus:ring-1 focus:ring-emerald-500 outline-none text-sm transition-all"
          value={query}
          onChange={handleChange}
          onFocus={() => query && setIsOpen(true)}
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
          >
            <X size={15} />
          </button>
        )}
      </form>

      {isOpen && query && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
          {isSearching ? (
            <div className="px-4 py-3 text-xs text-slate-400">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-400">No matching customer found.</div>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openCustomer(c)}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition border-b border-slate-50 last:border-0 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{c.accountName}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{c.barcode}{c.rateRef ? ` · REF-${c.rateRef}` : ''}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default BarcodeSearchBar;