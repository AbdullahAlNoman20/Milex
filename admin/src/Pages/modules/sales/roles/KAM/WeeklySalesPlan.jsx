// FILE: admin/src/Pages/modules/sales/roles/KAM/WeeklySalesPlan.jsx 
import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
  Pencil,
  CalendarRange,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { useToast } from "../../../../../Components/hooks/useToast";
import { todayLocalISO } from "../../../../../Components/utils/date";
import {
  VISIT_SECTIONS,
  getWeekStart,
  getWeekEnd,
  formatDateRange,
  buildEmptyVisit,
} from "../../constants/weeklyPlanStatus";
import { listPlansForKam, savePlan, deletePlan } from "../../services/weeklyPlanService";
import { isRequired } from "../../../../../Components/utils/validators";

const buildEmptyPlan = (weekStartDate = getWeekStart()) => ({
  id: null,
  weekStartDate,
  existingVisits: [],
  prospectVisits: [],
});

const isNewRow = (id) => typeof id === "string" && id.startsWith("v_");

const VisitTable = ({ title, visits, onAdd, onChange, onRemove, editingRowIds, onUnlock }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
    <div className="flex justify-between items-center">
      <h3 className="font-bold text-slate-800">{title}</h3>
      <button type="button" onClick={onAdd} className="text-xs font-bold text-emerald-700 flex items-center hover:text-emerald-800">
        <Plus size={14} className="mr-1" /> Add Visit
      </button>
    </div>
    {visits.length === 0 ? (
      <p className="text-xs text-slate-400">No visits planned yet.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[560px]">
          <thead>
            <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
              <th className="py-2 pr-3 w-36">Date</th>
              <th className="py-2 pr-3">Customer Name</th>
              <th className="py-2 pr-3">Purpose</th>
              <th className="py-2 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visits.map((v) => {
              const locked = !isNewRow(v.id) && !editingRowIds.has(v.id);
              return (
                <tr key={v.id} className="align-top">
                  <td className="py-2 pr-3">
                    <input
                      type="date"
                      disabled={locked}
                      className={`w-full border p-2 rounded text-xs outline-none focus:border-emerald-500 ${locked ? "bg-slate-50 text-slate-500 border-slate-100" : "bg-white border-slate-200"}`}
                      value={v.day}
                      onChange={(e) => onChange({ ...v, day: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      disabled={locked}
                      className={`w-full border p-2 rounded text-xs outline-none focus:border-emerald-500 ${locked ? "bg-slate-50 text-slate-500 border-slate-100" : "bg-white border-slate-200"}`}
                      placeholder="Customer name"
                      value={v.customerName}
                      maxLength={200}
                      onChange={(e) => onChange({ ...v, customerName: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      disabled={locked}
                      className={`w-full border p-2 rounded text-xs outline-none focus:border-emerald-500 ${locked ? "bg-slate-50 text-slate-500 border-slate-100" : "bg-white border-slate-200"}`}
                      placeholder="Purpose of visit"
                      value={v.purpose}
                      maxLength={300}
                      onChange={(e) => onChange({ ...v, purpose: e.target.value })}
                    />
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {locked && (
                      <button type="button" onClick={() => onUnlock(v.id)} className="text-slate-300 hover:text-emerald-600 transition mr-2" aria-label="Edit this visit">
                        <Pencil size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove(v.id)}
                      aria-label="Remove this visit"
                      className="text-slate-300 hover:text-red-500 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const WeeklySalesPlan = () => {
  const { showToast } = useToast();
  const currentWeekStart = getWeekStart();
  const [plan, setPlan] = useState(buildEmptyPlan(currentWeekStart));
  const [allPlans, setAllPlans] = useState([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const plans = await listPlansForKam();
      setAllPlans(plans);
      const existingForWeek = plans.find((p) => p.weekStartDate === currentWeekStart);
      setPlan(existingForWeek || buildEmptyPlan(currentWeekStart));
      setEditingRowIds(new Set());
    } catch (err) {
      showToast(err?.message || "Failed to load weekly plans", "error");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPlans();
  }, [loadPlans]);

  const addVisit = (section) => {
    const today = todayLocalISO();
    setPlan((prev) => ({
      ...prev,
      [section === VISIT_SECTIONS.EXISTING ? "existingVisits" : "prospectVisits"]: [
        ...(section === VISIT_SECTIONS.EXISTING ? prev.existingVisits : prev.prospectVisits),
        buildEmptyVisit(today),
      ],
    }));
  };

  const updateVisit = (section, id, updated) => {
    const key = section === VISIT_SECTIONS.EXISTING ? "existingVisits" : "prospectVisits";
    setPlan((prev) => ({ ...prev, [key]: prev[key].map((v) => (v.id === id ? updated : v)) }));
  };

  const removeVisit = (section, id) => {
    const key = section === VISIT_SECTIONS.EXISTING ? "existingVisits" : "prospectVisits";
    setPlan((prev) => ({ ...prev, [key]: prev[key].filter((v) => v.id !== id) }));
  };

  const unlockRow = (id) => setEditingRowIds((prev) => new Set(prev).add(id));

  const validate = () => {
    const allVisits = [...plan.existingVisits, ...plan.prospectVisits];
    const incomplete = allVisits.find((v) => !isRequired(v.customerName) || !isRequired(v.purpose) || !isRequired(v.day));
    if (incomplete) {
      showToast("Every visit needs a date, customer name and purpose", "warning");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!validate()) return;
    setIsSaving(true);
    try {
      const saved = await savePlan(plan);
      setPlan(saved);
      setEditingRowIds(new Set());
      setAllPlans((prev) => {
        const others = prev.filter((p) => p.weekStartDate !== saved.weekStartDate);
        return [saved, ...others].sort((a, b) => (a.weekStartDate < b.weekStartDate ? 1 : -1));
      });
      showToast("Weekly plan saved", "success");
    } catch (err) {
      showToast(err?.message || "Failed to save plan", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const loadWeekIntoForm = (p) => {
    setPlan(p);
    setEditingRowIds(new Set());
    setExpandedHistoryId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToCurrentWeek = () => {
    const existingForWeek = allPlans.find((p) => p.weekStartDate === currentWeekStart);
    loadWeekIntoForm(existingForWeek || buildEmptyPlan(currentWeekStart));
  };

  const handleDelete = async (p) => {
    if (isDeleting) return;
    if (!window.confirm(`Delete the weekly plan for ${formatDateRange(p.weekStartDate, getWeekEnd(p.weekStartDate))}? This cannot be undone.`)) return;
    setIsDeleting(p.id);
    try {
      await deletePlan(p.id);
      const remaining = allPlans.filter((x) => x.id !== p.id);
      setAllPlans(remaining);
      if (plan.id === p.id) {
        const stillCurrent = remaining.find((x) => x.weekStartDate === currentWeekStart);
        setPlan(stillCurrent || buildEmptyPlan(currentWeekStart));
        setEditingRowIds(new Set());
      }
      showToast("Weekly plan deleted", "success");
    } catch (err) {
      showToast(err?.message || "Failed to delete plan", "error");
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) return <div className="text-center py-16 text-sm text-slate-400">Loading weekly plan...</div>;

  const isEditingCurrentWeek = plan.weekStartDate === currentWeekStart;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Weekly Sales Planning</h2>
          <p className="text-sm text-slate-500 mt-1">Save a plan for any week whenever you like — no approval needed. Edit or delete anytime.</p>
        </div>
        {!isEditingCurrentWeek && (
          <button type="button" onClick={goToCurrentWeek} className="text-xs font-bold text-emerald-700 border border-emerald-200 bg-emerald-50 px-3 py-2 rounded-lg flex items-center hover:bg-emerald-100 transition">
            <RotateCcw size={13} className="mr-1.5" /> Back to This Week
          </button>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center text-sm text-slate-600">
          <CalendarRange size={16} className="mr-2 text-slate-400 shrink-0" />
          Editing week: <span className="font-bold text-slate-800 ml-1">{formatDateRange(plan.weekStartDate, getWeekEnd(plan.weekStartDate))}</span>
        </div>
        {isEditingCurrentWeek && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">Current Week</span>
        )}
      </div>

      <VisitTable
        title="Existing Client Visits"
        visits={plan.existingVisits}
        editingRowIds={editingRowIds}
        onUnlock={unlockRow}
        onAdd={() => addVisit(VISIT_SECTIONS.EXISTING)}
        onChange={(updated) => updateVisit(VISIT_SECTIONS.EXISTING, updated.id, updated)}
        onRemove={(id) => removeVisit(VISIT_SECTIONS.EXISTING, id)}
      />

      <VisitTable
        title="Prospect Client Visits"
        visits={plan.prospectVisits}
        editingRowIds={editingRowIds}
        onUnlock={unlockRow}
        onAdd={() => addVisit(VISIT_SECTIONS.PROSPECT)}
        onChange={(updated) => updateVisit(VISIT_SECTIONS.PROSPECT, updated.id, updated)}
        onRemove={(id) => removeVisit(VISIT_SECTIONS.PROSPECT, id)}
      />

      <div className="flex justify-end gap-3">
        {plan.id && (
          <button
            type="button"
            disabled={isDeleting === plan.id}
            onClick={() => handleDelete(plan)}
            className="px-5 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition flex items-center disabled:opacity-50"
          >
            {isDeleting === plan.id ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Trash2 size={16} className="mr-2" />}
            Delete This Plan
          </button>
        )}
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="px-6 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center shadow-md hover:bg-emerald-800 transition disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
          Save Plan
        </button>
      </div>

      {allPlans.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 pb-2">
            <h3 className="font-bold text-slate-800 text-sm">All Saved Weeks</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {allPlans.map((p) => {
              const totalVisits = p.existingVisits.length + p.prospectVisits.length;
              const isActive = p.weekStartDate === plan.weekStartDate;
              return (
                <div key={p.id} className={isActive ? "bg-emerald-50/40" : ""}>
                  <div className="w-full flex justify-between items-center px-6 py-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedHistoryId(expandedHistoryId === p.id ? null : p.id)}
                      className="flex-1 flex items-center justify-between text-left hover:opacity-75 transition min-w-0"
                    >
                      <span className="text-xs font-bold text-slate-700 truncate">
                        {formatDateRange(p.weekStartDate, getWeekEnd(p.weekStartDate))}
                        {isActive && <span className="ml-2 text-[9px] font-bold uppercase text-emerald-700">Editing</span>}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">{totalVisits} visit(s)</span>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => loadWeekIntoForm(p)}
                        aria-label="Edit this week's plan"
                        className="w-7 h-7 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition inline-flex items-center justify-center"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting === p.id}
                        onClick={() => handleDelete(p)}
                        aria-label="Delete this week's plan"
                        className="w-7 h-7 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition inline-flex items-center justify-center disabled:opacity-50"
                      >
                        {isDeleting === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedHistoryId(expandedHistoryId === p.id ? null : p.id)}
                        aria-label="Toggle details"
                        className="w-7 h-7 rounded-full text-slate-300 hover:text-slate-600 transition inline-flex items-center justify-center"
                      >
                        {expandedHistoryId === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>
                  {expandedHistoryId === p.id && (
                    <div className="px-6 pb-5 space-y-4">
                      {totalVisits === 0 ? (
                        <p className="text-xs text-slate-400">No visits in this plan.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[420px] text-xs">
                            <thead>
                              <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
                                <th className="py-2 pr-3 w-32">Date</th>
                                <th className="py-2 pr-3">Customer Name</th>
                                <th className="py-2">Purpose</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {[...p.existingVisits, ...p.prospectVisits].map((v) => (
                                <tr key={v.id}>
                                  <td className="py-2 pr-3 font-bold text-slate-700 w-32">
                                    {new Date(v.day).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                  </td>
                                  <td className="py-2 pr-3 text-slate-700">{v.customerName}</td>
                                  <td className="py-2 text-slate-500">{v.purpose}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklySalesPlan;