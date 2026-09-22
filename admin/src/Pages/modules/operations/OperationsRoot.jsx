// src/Pages/modules/operations/OperationsRoot.jsx
import { Outlet } from 'react-router-dom';
import { OperationsAuthProvider } from './context/OperationsAuthContext';

const OperationsRoot = () => (
  <OperationsAuthProvider>
    <Outlet />
  </OperationsAuthProvider>
);

export default OperationsRoot;