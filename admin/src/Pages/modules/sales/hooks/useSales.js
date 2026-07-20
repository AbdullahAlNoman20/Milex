// src/Pages/modules/sales/hooks/useSales.js
import { useContext } from 'react';
import { SalesContext } from '../context/SalesContextObject';

export const useSales = () => {
  const ctx = useContext(SalesContext);
  if (!ctx) throw new Error('useSales must be used within a SalesProvider');
  return ctx;
};