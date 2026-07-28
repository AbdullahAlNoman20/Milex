// admin/src/Pages/modules/sales/components/CustomerSearchSelect.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { searchCustomers } from "../services/customerService";

const DEBOUNCE_MS = 200;

const CustomerSearchSelect = ({
  value,
  onSelect,
  placeholder = "Search customer...",
  disabled = false,
}) => {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const runSearch = useCallback((term) => {
    clearTimeout(debounceRef.current);
    if (!term.trim()) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const items = await searchCustomers(term.trim());
        if (requestId !== requestIdRef.current) return;
        setResults(items);
      } catch {
        if (requestId === requestIdRef.current) setResults([]);
      } finally {
        if (requestId === requestIdRef.current) setIsSearching(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value.slice(0, 200);
    setQuery(val);
    setIsOpen(true);
    onSelect({ customerName: val, customerId: null });
    runSearch(val);
  };

  const handlePick = (c) => {
    setQuery(c.accountName);
    setResults([]);
    setIsOpen(false);
    onSelect({ customerName: c.accountName, customerId: c.id });
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    onSelect({ customerName: "", customerId: null });
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400">
          <Search size={12} />
        </span>
        <input
          disabled={disabled}
          className="w-full border border-slate-200 p-2 pl-7 pr-6 rounded text-xs outline-none focus:border-emerald-500 bg-white disabled:bg-slate-50"
          placeholder={placeholder}
          value={query}
          maxLength={200}
          onChange={handleChange}
          onFocus={() => query && setIsOpen(true)}
        />
        {query && !disabled && (
          <button
            type="button"
            onClick={clear}
            className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-300 hover:text-slate-500"
          >
            <X size={12} />
          </button>
        )}
      </div>
      {isOpen && query && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto">
          {isSearching ? (
            <div className="px-3 py-2 text-[11px] text-slate-400">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-slate-400">
              No matching customer — you can still type a custom name.
            </div>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handlePick(c)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition border-b border-slate-50 last:border-0"
              >
                <p className="font-bold text-slate-800 truncate">
                  {c.accountName}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {c.barcode}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSearchSelect;
