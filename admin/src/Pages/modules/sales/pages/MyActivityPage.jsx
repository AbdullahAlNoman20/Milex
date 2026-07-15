// admin/src/Pages/modules/sales/pages/MyActivityPage.jsx 
import React, { useEffect, useState } from 'react';
import { History as HistoryIcon, LogIn, Activity } from 'lucide-react';
import { getMyActivity } from '../services/teamService';
import { humanizeAction } from '../../../../Components/utils/format';
import Loader from '../../../../Components/Shared/Loader';

const MyActivityPage = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMyActivity().then(setItems).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <Loader fullScreen label="Loading activity..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center">
        <HistoryIcon size={22} className="mr-2 text-slate-400" /> My Activity
      </h2>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">No activity recorded yet.</p>
        ) : (
          items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.type === 'LOGIN' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {item.type === 'LOGIN' ? <LogIn size={14} /> : <Activity size={14} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">{item.type === 'LOGIN' ? 'Logged In' : humanizeAction(item.action)}</p>
                {item.entity && <p className="text-xs text-slate-400">on {item.entity}</p>}
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyActivityPage;