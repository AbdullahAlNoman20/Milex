// src/Pages/modules/operations/components/PagePlaceholder.jsx
import { useOperationsAuth } from '../hooks/useOperationsAuth';

const PagePlaceholder = ({ title, description }) => {
  const { currentUser } = useOperationsAuth();
  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">{title}</h1>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <p className="text-sm text-slate-500">
          This page is set up and ready for {currentUser?.name || 'you'}. Detailed functionality will be added here next.
        </p>
      </div>
    </div>
  );
};

export default PagePlaceholder;