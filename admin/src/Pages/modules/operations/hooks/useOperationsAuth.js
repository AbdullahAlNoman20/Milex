// src/Pages/modules/operations/hooks/useOperationsAuth.js
import { useContext } from 'react';
import { OperationsAuthContext } from '../context/OperationsAuthContextObject';

export const useOperationsAuth = () => {
  const ctx = useContext(OperationsAuthContext);
  if (!ctx) throw new Error('useOperationsAuth must be used within an OperationsAuthProvider');
  return ctx;
};