// admin/src/Components/hooks/useConfirm.js
import { useContext } from 'react';
import { ConfirmContext } from '../context/ConfirmContextObject';

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx.confirm;
};