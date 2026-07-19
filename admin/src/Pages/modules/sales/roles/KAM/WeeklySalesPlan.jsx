// admin/src/Pages/modules/sales/roles/KAM/WeeklySalesPlan.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Send,
  Save,
  ChevronDown,
  ChevronUp,
  Pencil,
  CalendarRange,
} from "lucide-react";
import { useToast } from "../../../../../Components/hooks/useToast";
import {
  VISIT_SECTIONS,
  getWeekStart,
  getWeekEnd,
  formatDateRange,
  buildEmptyVisit,
} from "../../constants/weeklyPlanStatus";
import {
  listPlansForKam,
  savePlan,
  submitPlan,
} from "../../services/weeklyPlanService";
import { isRequired } from "../../../../../Components/utils/validators";

const buildEmptyPlan = () => ({
  weekStartDate: getWeekStart(),
  existingVisits: [],
  prospectVisits: [],
  status: "DRAFT",
});

const isNewRow = (id) => typeof id === "string" && id.startsWith("v_");

const VisitTable = ({
  title,
  visits,
  onAdd,
  onChange,
  onRemove,
  editingRowIds,
  onUnlock,
}) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
    <div className="flex justify-between items-center">
      <h3 className="font-bold text-slate-800">{title}</h3>
      <button
        type="button"
        onClick={onAdd}
        className="text-xs font-bold text-emerald-700 flex items-center hover:text-emerald-800"
      >
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
                      onChange={(e) =>
                        onChange({ ...v, customerName: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      disabled={locked}
                      className={`w-full border p-2 rounded text-xs outline-none focus:border-emerald-500 ${locked ? "bg-slate-50 text-slate-500 border-slate-100" : "bg-white border-slate-200"}`}
                      placeholder="Purpose of visit"
                      value={v.purpose}
                      maxLength={300}
                      onChange={(e) =>
                        onChange({ ...v, purpose: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {locked && (
                      <button
                        type="button"
                        onClick={() => onUnlock(v.id)}
                        className="text-slate-300 hover:text-emerald-600 transition mr-2"
                        aria-label="Edit this visit"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onRemove}
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
  const [plan, setPlan] = useState(buildEmptyPlan());
  const [history, setHistory] = useState([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const plans = await listPlansForKam();
      const currentWeek = getWeekStart();
      const existingForWeek = plans.find(
        (p) => p.weekStartDate === currentWeek,
      );
      setPlan(existingForWeek || buildEmptyPlan());
      setEditingRowIds(new Set());
      setHistory(plans.filter((p) => p.weekStartDate !== currentWeek));
    } catch (err) {
      showToast(err?.message || "Failed to load weekly plans", "error");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const addVisit = (section) => {
    setPlan((prev) => ({
      ...prev,
      [section === VISIT_SECTIONS.EXISTING
        ? "existingVisits"
        : "prospectVisits"]: [
        ...(section === VISIT_SECTIONS.EXISTING
          ? prev.existingVisits
          : prev.prospectVisits),
        buildEmptyVisit(plan.weekStartDate),
      ],
    }));
  };

  const updateVisit = (section, id, updated) => {
    const key =
      section === VISIT_SECTIONS.EXISTING ? "existingVisits" : "prospectVisits";
    setPlan((prev) => ({
      ...prev,
      [key]: prev[key].map((v) => (v.id === id ? updated : v)),
    }));
  };

  const removeVisit = (section, id) => {
    const key =
      section === VISIT_SECTIONS.EXISTING ? "existingVisits" : "prospectVisits";
    setPlan((prev) => ({
      ...prev,
      [key]: prev[key].filter((v) => v.id !== id),
    }));
  };

  const unlockRow = (id) => setEditingRowIds((prev) => new Set(prev).add(id));

  const validate = () => {
    const allVisits = [...plan.existingVisits, ...plan.prospectVisits];
    if (allVisits.length === 0)
      return (showToast("Add at least one planned visit", "warning"), false);
    const incomplete = allVisits.find(
      (v) =>
        !isRequired(v.customerName) ||
        !isRequired(v.purpose) ||
        !isRequired(v.day),
    );
    if (incomplete)
      return (
        showToast(
          "Every visit needs a date, customer name and purpose",
          "warning",
        ),
        false
      );
    return true;
  };

  const handleSaveDraft = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const saved = await savePlan(plan);
      setPlan(saved);
      setEditingRowIds(new Set());
      showToast("Weekly plan saved", "success");
    } catch (err) {
      showToast(err?.message || "Failed to save plan", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (isSaving) return;
    if (!validate()) return;
    setIsSaving(true);
    try {
      const saved = await savePlan(plan);
      const submittedPlan = await submitPlan(saved.weekStartDate);
      setPlan(submittedPlan);
      setEditingRowIds(new Set());
      showToast("Weekly plan submitted", "success");
    } catch (err) {
      showToast(err?.message || "Failed to submit plan", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="text-center py-16 text-sm text-slate-400">
        Loading weekly plan...
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          Weekly Sales Planning
        </h2>
      </div>

      <VisitTable
        title="Existing Client Visits"
        visits={plan.existingVisits}
        editingRowIds={editingRowIds}
        onUnlock={unlockRow}
        onAdd={() => addVisit(VISIT_SECTIONS.EXISTING)}
        onChange={(updated) =>
          updateVisit(VISIT_SECTIONS.EXISTING, updated.id, updated)
        }
        onRemove={(id) => removeVisit(VISIT_SECTIONS.EXISTING, id)}
      />

      <VisitTable
        title="Prospect Client Visits"
        visits={plan.prospectVisits}
        editingRowIds={editingRowIds}
        onUnlock={unlockRow}
        onAdd={() => addVisit(VISIT_SECTIONS.PROSPECT)}
        onChange={(updated) =>
          updateVisit(VISIT_SECTIONS.PROSPECT, updated.id, updated)
        }
        onRemove={(id) => removeVisit(VISIT_SECTIONS.PROSPECT, id)}
      />

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center text-sm text-slate-600">
        <CalendarRange size={16} className="mr-2 text-slate-400 shrink-0" />
        Week:{" "}
        <span className="font-bold text-slate-800 ml-1">
          {formatDateRange(plan.weekStartDate, getWeekEnd(plan.weekStartDate))}
        </span>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSaveDraft}
          className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition flex items-center disabled:opacity-50"
        >
          <Save size={16} className="mr-2" /> Save
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSubmit}
          className="px-6 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center shadow-md hover:bg-emerald-800 transition disabled:opacity-50"
        >
          <Send size={16} className="mr-2" /> Submit
        </button>
      </div>

      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 pb-2">
            <h3 className="font-bold text-slate-800 text-sm">Previous Weeks</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {history.map((p) => (
              <div key={p.id}>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedHistoryId(
                      expandedHistoryId === p.id ? null : p.id,
                    )
                  }
                  className="w-full flex justify-between items-center px-6 py-3 text-left hover:bg-slate-50 transition"
                >
                  <span className="text-xs font-bold text-slate-700">
                    {formatDateRange(
                      p.weekStartDate,
                      getWeekEnd(p.weekStartDate),
                    )}
                  </span>
                  {expandedHistoryId === p.id ? (
                    <ChevronUp size={14} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={14} className="text-slate-400" />
                  )}
                </button>
                {expandedHistoryId === p.id && (
                  <div className="px-6 pb-5 space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[420px] text-xs">
                        <tbody className="divide-y divide-slate-100">
                          {[...p.existingVisits, ...p.prospectVisits].map(
                            (v) => (
                              <tr key={v.id}>
                                <td className="py-2 pr-3 font-bold text-slate-700 w-32">
                                  {new Date(v.day).toLocaleDateString(
                                    undefined,
                                    { month: "short", day: "numeric" },
                                  )}
                                </td>
                                <td className="py-2 pr-3 text-slate-700">
                                  {v.customerName}
                                </td>
                                <td className="py-2 text-slate-500">
                                  {v.purpose}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklySalesPlan;
