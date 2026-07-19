// admin/src/Pages/modules/sales/pages/TeamReportsPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Eye, X, Users } from "lucide-react";
import { useToast } from "../../../../Components/hooks/useToast";
import { listKams } from "../services/teamService";
import { listPlansForKamId } from "../services/weeklyPlanService";
import { listReportsForKam } from "../services/dailyReportService";
import { humanizeStatus } from "../../../../Components/utils/format";
import Loader from "../../../../Components/Shared/Loader";

const TeamReportsPage = () => {
  const { showToast } = useToast();
  const [kams, setKams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeKam, setActiveKam] = useState(null);
  const [tab, setTab] = useState("weekly");
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    listKams()
      .then(setKams)
      .catch((err) =>
        showToast(err?.message || "Failed to load team members", "error"),
      )
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openKam = useCallback(
    async (kam) => {
      setActiveKam(kam);
      setTab("weekly");
      setIsDetailLoading(true);
      try {
        const [plans, reports] = await Promise.all([
          listPlansForKamId(kam.id),
          listReportsForKam(kam.id),
        ]);
        setWeeklyPlans(plans);
        setDailyReports(reports);
      } catch (err) {
        showToast(err?.message || "Failed to load reports", "error");
      } finally {
        setIsDetailLoading(false);
      }
    },
    [showToast],
  );

  if (isLoading) return <Loader fullScreen label="Loading team..." />;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center">
        <Users size={22} className="mr-2 text-slate-400" /> Team Reports
      </h2>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 font-semibold bg-slate-50">
              <th className="p-4 pl-6">KAM NAME</th>
              <th className="p-4">EMAIL</th>
              <th className="p-4 pr-6 text-right">VIEW</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {kams.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-slate-400">
                  No KAMs found.
                </td>
              </tr>
            ) : (
              kams.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 pl-6 font-bold text-slate-800">
                    {k.name}
                  </td>
                  <td className="p-4 text-slate-500">{k.email}</td>
                  <td className="p-4 pr-6 text-right">
                    <button
                      type="button"
                      onClick={() => openKam(k)}
                      aria-label={`View reports for ${k.name}`}
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

      {activeKam && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-800">{activeKam.name}</p>
                <p className="text-xs text-slate-400">{activeKam.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveKam(null)}
                className="text-slate-400 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2 px-5 pt-4 border-b border-slate-100">
              {[
                { key: "weekly", label: "Weekly Plans" },
                { key: "daily", label: "Daily Reports" },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
                    tab === t.key
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-slate-400"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {isDetailLoading ? (
                <Loader label="Loading..." />
              ) : tab === "weekly" ? (
                weeklyPlans.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    No weekly plans yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {weeklyPlans.map((p) => (
                      <div
                        key={p.id}
                        className="border border-slate-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-700">
                            Week of {p.weekStartDate}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-amber-600">
                            {humanizeStatus(p.status)}
                          </span>
                        </div>
                        {p.lmComments && (
                          <p className="text-xs text-red-600 mb-2">
                            <strong>Feedback:</strong> {p.lmComments}
                          </p>
                        )}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[520px]">
                            <thead>
                              <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
                                <th className="py-2 pr-3">Day</th>
                                <th className="py-2 pr-3">Customer Name</th>
                                <th className="py-2 pr-3">Purpose</th>
                                <th className="py-2">Outcome / Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {[...p.existingVisits, ...p.prospectVisits].map(
                                (v) => (
                                  <tr key={v.id} className="text-xs align-top">
                                    <td className="py-2.5 pr-3 font-bold text-slate-700">
                                      {v.day}
                                    </td>
                                    <td className="py-2.5 pr-3 text-slate-700">
                                      {v.customerName}
                                    </td>
                                    <td className="py-2.5 pr-3 text-slate-500">
                                      {v.purpose}
                                    </td>
                                    <td className="py-2.5 text-slate-500">
                                      {v.outcomeNotes || "—"}
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : dailyReports.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  No daily reports yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {dailyReports.map((r) => (
                    <div
                      key={r.id}
                      className="border border-slate-200 rounded-lg p-4"
                    >
                      <p className="text-xs font-bold text-slate-700 mb-2">
                        {r.date}
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[560px]">
                          <thead>
                            <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
                              <th className="py-2 pr-3">Customer Name</th>
                              <th className="py-2 pr-3">Status</th>
                              <th className="py-2 pr-3">
                                Reason (if not completed)
                              </th>
                              <th className="py-2">Outcome / Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {r.visits.map((v) => (
                              <tr key={v.id} className="text-xs align-top">
                                <td className="py-2.5 pr-3 font-semibold text-slate-700">
                                  {v.customerName}
                                </td>
                                <td className="py-2.5 pr-3">
                                  <span
                                    className={`font-bold ${v.completed ? "text-emerald-600" : "text-red-500"}`}
                                  >
                                    {v.completed
                                      ? "Completed"
                                      : "Not Completed"}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-3 text-slate-500">
                                  {v.reasonIfNotCompleted || "—"}
                                </td>
                                <td className="py-2.5 text-slate-500">
                                  {v.outcomeNotes || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamReportsPage;
