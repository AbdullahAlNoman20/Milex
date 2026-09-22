// src/Pages/modules/operations/pages/OperationsIndex.jsx
import { Navigate } from 'react-router-dom';
import { useOperationsAuth } from '../hooks/useOperationsAuth';
import { OPERATIONS_ROLES } from '../constants/operationsRoles';
import Loader from '../../../../Components/Shared/Loader';

const ROLE_ROUTE_MAP = Object.freeze({
  [OPERATIONS_ROLES.CLIENT]: '/operations/client',
  [OPERATIONS_ROLES.OPERATIONS_HEAD]: '/operations/head',
  [OPERATIONS_ROLES.DOMESTIC_ADMIN]: '/operations/domestic',
  [OPERATIONS_ROLES.FOREIGN_ADMIN]: '/operations/foreign',
});

const OperationsIndex = () => {
  const { currentUser, isInitializing } = useOperationsAuth();

  if (isInitializing) {
    return <Loader fullScreen label="Loading dashboard..." />;
  }

  const target = ROLE_ROUTE_MAP[currentUser?.role];
  return <Navigate to={target || '/operations/unauthorized'} replace />;
};

export default OperationsIndex;