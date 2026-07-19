// admin/src/Pages/modules/sales/pages/MyActivityPage.jsx
import React, { useEffect, useState } from 'react';
import { History as HistoryIcon, LogIn, Activity } from 'lucide-react';
import { getMyActivity } from '../services/teamService';
import { listMyReports } from '../services/dailyReportService';
import { humanizeAction } from '../../../../Components/utils/format';
import Loader from '../../../../Components/Shared/Loader';

const MyActivityPage = () => {
  const [items, setItems] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [tab, setTab] = useState('activity');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMyActivity(), listMyReports()])
      .then(([activityItems, reports]) => {
        setItems(activityItems);
        const skips = reports.flatMap((r) =>
          r.visits.filter((v) => !v.completed).map((v) => ({ ...v, date: r.date }))
        );
        setSkipped(skips);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <Loader fullScreen label="Loading activity..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center">
        <HistoryIcon size={22} className="mr-2 text-slate-400" /> My Activity
      </h2>
      <div className="flex gap-2">
        <button type="button" onClick={() => setTab('activity')} className={`px-4 py-2 text-xs font-bold rounded-lg border transition ${tab === 'activity' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}>Activity Log</button>
        <button type="button" onClick={() => setTab('skipped')} className={`px-4 py-2 text-xs font-bold rounded-lg border transition ${tab === 'skipped' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}>Skipped Visits ({skipped.length})</button>
      </div>
      {tab === 'skipped' ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
          {skipped.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No skipped visits.</p>
          ) : (
            skipped.map((v, i) => (
              <div key={i} className="p-4">
                <p className="text-sm font-bold text-slate-800">{v.customerName} <span className="text-xs font-normal text-slate-400">— {v.date}</span></p>
                <p className="text-xs text-red-600 mt-1">{v.reasonIfNotCompleted}</p>
              </div>
            ))
          )}
        </div>
      ) : (
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
      )}
    </div>
  );
};

export default MyActivityPage;