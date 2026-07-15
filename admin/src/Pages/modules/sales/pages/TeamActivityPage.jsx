// admin/src/Pages/modules/sales/pages/TeamActivityPage.jsx 
import React, { useEffect, useState } from 'react';
import { Eye, X, Users2, LogIn, Activity } from 'lucide-react';
import { useToast } from '../../../../Components/hooks/useToast';
import { listStaffDirectory, getUserActivity } from '../services/teamService';
import { humanizeAction } from '../../../../Components/utils/format';
import Loader from '../../../../Components/Shared/Loader';

const ROLE_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'KAM', label: 'KAM' },
  { key: 'SALES_COORDINATOR', label: 'Sales Coordinator' },
];

const TeamActivityPage = () => {
  const { showToast } = useToast();
  const [staff, setStaff] = useState([]);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [activeUser, setActiveUser] = useState(null);
  const [activityItems, setActivityItems] = useState([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    listStaffDirectory()
      .then(setStaff)
      .catch((err) => showToast(err?.message || 'Failed to load team members', 'error'))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = roleFilter === 'ALL' ? staff : staff.filter((s) => s.role === roleFilter);

  const openUser = async (user) => {
    setActiveUser(user);
    setIsDetailLoading(true);
    try {
      const items = await getUserActivity(user.id);
      setActivityItems(items);
    } catch (err) {
      showToast(err?.message || 'Failed to load activity', 'error');
    } finally {
      setIsDetailLoading(false);
    }
  };

  if (isLoading) return <Loader fullScreen label="Loading team..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center">
        <Users2 size={22} className="mr-2 text-slate-400" /> Team Activity
      </h2>

      <div className="flex gap-2">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setRoleFilter(f.key)}
            className={`px-4 py-2 text-xs font-bold rounded-lg border transition ${
              roleFilter === f.key ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 font-semibold bg-slate-50">
              <th className="p-4 pl-6">NAME</th>
              <th className="p-4">ROLE</th>
              <th className="p-4">EMAIL</th>
              <th className="p-4 pr-6 text-right">VIEW</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400">No team members found.</td></tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 pl-6 font-bold text-slate-800">{u.name}</td>
                  <td className="p-4 text-xs font-semibold text-slate-500">{u.role === 'KAM' ? 'KAM' : 'Sales Coordinator'}</td>
                  <td className="p-4 text-slate-500">{u.email}</td>
                  <td className="p-4 pr-6 text-right">
                    <button
                      type="button"
                      onClick={() => openUser(u)}
                      aria-label={`View activity for ${u.name}`}
                      className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition inline-flex items-center justify-center"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {activeUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-800">{activeUser.name}</p>
                <p className="text-xs text-slate-400">{activeUser.email}</p>
              </div>
              <button type="button" onClick={() => setActiveUser(null)} className="text-slate-400 hover:text-slate-700 transition">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {isDetailLoading ? (
                <Loader label="Loading..." />
              ) : activityItems.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">No activity recorded yet.</p>
              ) : (
                activityItems.map((item, i) => (
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
        </div>
      )}
    </div>
  );
};

export default TeamActivityPage;