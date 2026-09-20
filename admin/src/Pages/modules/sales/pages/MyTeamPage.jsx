// admin/src/Pages/modules/sales/pages/MyTeamPage.jsx
import { useState, useEffect } from 'react';
import { Users, Mail, Loader2 } from 'lucide-react';
import { listTeam } from '../services/teamService';
import { ROLE_LABELS } from '../../../../Components/constants/roles';

// Who reports to whom, in one place. Without it the only way to find out
// which KAMs sit under a Line Manager is to open accounts one at a time and
// read the handler off each.
const MyTeamPage = () => {
  const [state, setState] = useState({ loaded: false, members: [], manager: null });

  useEffect(() => {
    let cancelled = false;
    listTeam()
      .then((data) => {
        if (!cancelled) setState({ loaded: true, members: data.members || [], manager: data.manager || null });
      })
      .catch(() => {
        if (!cancelled) setState({ loaded: true, members: [], manager: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state.loaded) {
    return (
      <div className="p-10 flex items-center justify-center gap-2 text-sm text-slate-400">
        <Loader2 size={16} className="animate-spin" /> Loading your team…
      </div>
    );
  }

  const byRole = state.members.reduce((acc, m) => {
    (acc[m.role] = acc[m.role] || []).push(m);
    return acc;
  }, {});

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 md:px-6 pt-4 pb-12 space-y-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Users size={20} className="text-slate-400" /> My Team
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Everyone reporting to you, and who you report to.
        </p>
      </div>

      {state.manager && (
        <div className="bg-white rounded-xl border border-slate-200 px-4 sm:px-5 py-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
            You Report To
          </p>
          <p className="text-sm font-semibold text-slate-800 break-words">{state.manager.name}</p>
          <p className="text-xs text-slate-500 break-words">
            {ROLE_LABELS[state.manager.role] || state.manager.role} · {state.manager.email}
          </p>
        </div>
      )}

      {state.members.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-10 text-center text-sm text-slate-400">
          Nobody is reporting to you yet.
        </div>
      ) : (
        Object.entries(byRole).map(([roleName, people]) => (
          <div key={roleName}>
            <div className="px-1 pb-2.5">
              <h3 className="font-bold text-sm text-slate-900">
                {ROLE_LABELS[roleName] || roleName}{' '}
                <span className="font-normal text-slate-400">({people.length})</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {people.map((m) => (
                <div
                  key={m.id}
                  className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 break-words">{m.name}</p>
                    <p className="text-xs text-slate-500 break-words flex items-center gap-1.5 mt-0.5">
                      <Mail size={11} className="shrink-0 text-slate-300" /> {m.email}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded ${
                      m.isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {m.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MyTeamPage;