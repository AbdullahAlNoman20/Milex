// FILE: admin/src/Pages/modules/sales/roles/KAM/WeeklySalesPlan.jsx
import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, Pencil, ChevronDown, Loader2, X } from "lucide-react";
import { useToast } from "../../../../../Components/hooks/useToast";
import { todayLocalISO } from "../../../../../Components/utils/date";
import {
  VISIT_SECTIONS,
  getWeekStart,
  getWeekEnd,
  formatDateRange,
  buildEmptyVisit,
} from "../../constants/weeklyPlanStatus";
import { listPlansForKam, savePlan } from "../../services/weeklyPlanService";
import { isRequired } from "../../../../../Components/utils/validators";
import CustomerSearchSelect from "../../components/CustomerSearchSelect";

const buildEmptyPlan = (weekStartDate = getWeekStart()) => ({
  id: null,
  weekStartDate,
  existingVisits: [],
  prospectVisits: [],
});

const isNewRow = (id) => typeof id === "string" && id.startsWith("v_");

const VISIT_STATUS_STYLES = {
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Skipped: "bg-red-50 text-red-600 ring-red-200",
  Planned: "bg-slate-100 text-slate-600 ring-slate-200",
};

const StatusBadge = ({ v }) => {
  const label = v.completed === true ? "Completed" : v.completed === false ? "Skipped" : "Planned";
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${VISIT_STATUS_STYLES[label]}`}>
      {label}
    </span>
  );
};

const formatDay = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" }) : "—";

const AddVisitModal = ({ section, onClose, onSave }) => {
  const [day, setDay] = useState(todayLocalISO());
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState(null);
  const [purpose, setPurpose] = useState("");
  const { showToast } = useToast();
  const searchable = section === VISIT_SECTIONS.EXISTING;

  const handleSubmit = () => {
    if (!isRequired(day) || !isRequired(customerName) || !isRequired(purpose)) {
      showToast("Date, customer name and purpose are required", "warning");
      return;
    }
    onSave({ ...buildEmptyVisit(day), customerName, customerId, purpose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-[12px] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#111827] text-sm">
            Add {section === VISIT_SECTIONS.EXISTING ? "Existing Client" : "Prospect"} Visit
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-[#111827] mb-1 block">Date</label>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-full border border-[#E5E7EB] p-2.5 rounded-[10px] text-xs outline-none focus:border-[#059669]"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-[#111827] mb-1 block">Customer Name</label>
          {searchable ? (
            <CustomerSearchSelect
              value={customerName}
              onSelect={({ customerName: n, customerId: id }) => {
                setCustomerName(n);
                setCustomerId(id);
              }}
            />
          ) : (
            <input
              value={customerName}
              maxLength={200}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              className="w-full border border-[#E5E7EB] p-2.5 rounded-[10px] text-xs outline-none focus:border-[#059669]"
            />
          )}
        </div>

        <div>
          <label className="text-[11px] font-semibold text-[#111827] mb-1 block">Visit Purpose</label>
          <input
            value={purpose}
            maxLength={300}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Purpose of visit"
            className="w-full border border-[#E5E7EB] p-2.5 rounded-[10px] text-xs outline-none focus:border-[#059669]"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-[10px] text-xs font-bold text-[#6B7280] hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2.5 rounded-[10px] text-xs font-bold text-white bg-[#059669] hover:bg-[#0D8A68] transition"
          >
            Add Visit
          </button>
        </div>
      </div>
    </div>
  );
};

const PreviousPlansModal = ({ plans, onClose, onSelect }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
    <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-[12px] p-5 space-y-3 max-h-[80vh] flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#111827] text-sm">Previous Plans</h3>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>
      <div className="overflow-y-auto divide-y divide-[#E5E7EB]">
        {plans.length === 0 && <p className="text-xs text-[#6B7280] py-4">No previous plans found.</p>}
        {plans.map((p) => {
          const total = p.existingVisits.length + p.prospectVisits.length;
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => onSelect(p)}
              className="w-full flex items-center justify-between py-3 text-left hover:bg-slate-50 transition px-1"
            >
              <span className="text-xs font-semibold text-[#111827]">
                {formatDateRange(p.weekStartDate, getWeekEnd(p.weekStartDate))}
              </span>
              <span className="text-[10px] text-[#6B7280]">{total} visit(s)</span>
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

const VisitRowCard = ({ v, locked, onChange, onRemove, onUnlock, searchableCustomer }) => (
  <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-4 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-[#6B7280]">{formatDay(v.day)}</p>
        {locked ? (
          <p className="text-sm font-semibold text-[#111827] break-words">{v.customerName}</p>
        ) : searchableCustomer ? (
          <CustomerSearchSelect
            value={v.customerName}
            onSelect={({ customerName, customerId }) => onChange({ ...v, customerName, customerId })}
          />
        ) : (
          <input
            className="w-full border border-[#E5E7EB] p-2 rounded-[10px] text-xs outline-none focus:border-[#059669] font-semibold"
            value={v.customerName}
            maxLength={200}
            onChange={(e) => onChange({ ...v, customerName: e.target.value })}
          />
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {locked && (
          <button type="button" onClick={() => onUnlock(v.id)} className="text-slate-300 hover:text-[#059669] transition" aria-label="Edit">
            <Pencil size={14} />
          </button>
        )}
        {isNewRow(v.id) && (
          <button type="button" onClick={() => onRemove(v.id)} className="text-slate-300 hover:text-red-500 transition" aria-label="Delete">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>

    {locked ? (
      <p className="text-xs text-[#6B7280] break-words">{v.purpose}</p>
    ) : (
      <input
        className="w-full border border-[#E5E7EB] p-2 rounded-[10px] text-xs outline-none focus:border-[#059669]"
        placeholder="Purpose of visit"
        value={v.purpose}
        maxLength={300}
        onChange={(e) => onChange({ ...v, purpose: e.target.value })}
      />
    )}

    {!isNewRow(v.id) && <StatusBadge v={v} />}
  </div>
);

const WeeklySalesPlan = () => {
  const { showToast } = useToast();
  const currentWeekStart = getWeekStart();
  const [plan, setPlan] = useState(buildEmptyPlan(currentWeekStart));
  const [allPlans, setAllPlans] = useState([]);
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(VISIT_SECTIONS.EXISTING);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPreviousPlans, setShowPreviousPlans] = useState(false);

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

  const addVisit = (section, visitData) => {
    const key = section === VISIT_SECTIONS.EXISTING ? "existingVisits" : "prospectVisits";
    setPlan((prev) => ({ ...prev, [key]: [...prev[key], visitData] }));
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

const sanitizeVisit = (v) => ({
    ...v,
    customerName: v.customerName || "",
    purpose: v.purpose || "",
    day: v.day || "",
    reasonIfNotCompleted: v.reasonIfNotCompleted || "",
    outcomeNotes: v.outcomeNotes || "",
    customerId: v.customerId ?? null,
  });

  const handleSave = async () => {
    if (isSaving) return;
    if (!validate()) return;
    setIsSaving(true);
    try {
      const sanitizedPlan = {
        ...plan,
        existingVisits: plan.existingVisits.map(sanitizeVisit),
        prospectVisits: plan.prospectVisits.map(sanitizeVisit),
      };
      const saved = await savePlan(sanitizedPlan);
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
    setShowPreviousPlans(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToCurrentWeek = () => {
    const existingForWeek = allPlans.find((p) => p.weekStartDate === currentWeekStart);
    loadWeekIntoForm(existingForWeek || buildEmptyPlan(currentWeekStart));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#6B7280] gap-2 bg-[#F8F9FA] min-h-screen">
        <Loader2 size={16} className="animate-spin" /> Loading weekly plan...
      </div>
    );
  }

  const isEditingCurrentWeek = plan.weekStartDate === currentWeekStart;
  const totalExisting = plan.existingVisits.length;
  const totalProspect = plan.prospectVisits.length;
  const totalVisits = totalExisting + totalProspect;
  const activeVisits = activeTab === VISIT_SECTIONS.EXISTING ? plan.existingVisits : plan.prospectVisits;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-28 md:pb-8">
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-5 md:py-8 space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-[#111827]">Weekly Sales Planning</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">Plan your customer visits for the week.</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToCurrentWeek}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111827] border border-[#E5E7EB] bg-white px-3 py-2 rounded-[10px]"
              >
                {formatDateRange(plan.weekStartDate, getWeekEnd(plan.weekStartDate))}
                <ChevronDown size={14} className="text-[#6B7280]" />
              </button>
              {isEditingCurrentWeek && (
                <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1.5 text-[10px] font-bold bg-[#059669] text-white">
                  Current Week
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPreviousPlans(true)}
                className="text-xs font-semibold text-[#6B7280] hover:text-[#059669] transition underline underline-offset-2"
              >
                Previous Plans
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 bg-[#059669] text-white rounded-[10px] text-xs font-bold hover:bg-[#0D8A68] transition disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Weekly Plan
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-[#E5E7EB]">
          {[
            { key: VISIT_SECTIONS.EXISTING, label: "Existing Clients" },
            { key: VISIT_SECTIONS.PROSPECT, label: "Prospects" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-xs font-bold transition border-b-2 -mb-px ${
                activeTab === t.key ? "border-[#059669] text-[#059669]" : "border-transparent text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Visit List */}
        {activeVisits.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-[12px] px-5 py-8 text-center text-xs text-[#6B7280]">
            No visits planned yet.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white border border-[#E5E7EB] rounded-[12px] overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wide border-b border-[#E5E7EB]">
                    <th className="py-2.5 px-4 w-28">Date</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Purpose</th>
                    <th className="py-2.5 px-3 w-28">Status</th>
                    <th className="py-2.5 px-3 w-20 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {activeVisits.map((v) => {
                    const locked = !isNewRow(v.id) && !editingRowIds.has(v.id);
                    return (
                      <tr key={v.id} className="align-top">
                        <td className="py-2.5 px-4">
                          {locked ? (
                            <span className="text-xs text-[#111827] font-medium">{formatDay(v.day)}</span>
                          ) : (
                            <input
                              type="date"
                              className="w-full border border-[#E5E7EB] p-1.5 rounded-[8px] text-xs outline-none focus:border-[#059669]"
                              value={v.day}
                              onChange={(e) => updateVisit(activeTab, v.id, { ...v, day: e.target.value })}
                            />
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {locked ? (
                            <span className="text-xs font-semibold text-[#111827]">{v.customerName}</span>
                          ) : activeTab === VISIT_SECTIONS.EXISTING ? (
                            <CustomerSearchSelect
                              value={v.customerName}
                              onSelect={({ customerName, customerId }) =>
                                updateVisit(activeTab, v.id, { ...v, customerName, customerId })
                              }
                            />
                          ) : (
                            <input
                              className="w-full border border-[#E5E7EB] p-1.5 rounded-[8px] text-xs outline-none focus:border-[#059669] font-semibold"
                              value={v.customerName}
                              maxLength={200}
                              onChange={(e) => updateVisit(activeTab, v.id, { ...v, customerName: e.target.value })}
                            />
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {locked ? (
                            <span className="text-xs text-[#6B7280]">{v.purpose}</span>
                          ) : (
                            <input
                              className="w-full border border-[#E5E7EB] p-1.5 rounded-[8px] text-xs outline-none focus:border-[#059669]"
                              value={v.purpose}
                              maxLength={300}
                              onChange={(e) => updateVisit(activeTab, v.id, { ...v, purpose: e.target.value })}
                            />
                          )}
                        </td>
                        <td className="py-2.5 px-3">{!isNewRow(v.id) && <StatusBadge v={v} />}</td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {locked && (
                            <button
                              type="button"
                              onClick={() => unlockRow(v.id)}
                              className="text-slate-300 hover:text-[#059669] transition mr-2"
                              aria-label="Edit"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {isNewRow(v.id) && (
                            <button
                              type="button"
                              onClick={() => removeVisit(activeTab, v.id)}
                              className="text-slate-300 hover:text-red-500 transition"
                              aria-label="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {activeVisits.map((v) => (
                <VisitRowCard
                  key={v.id}
                  v={v}
                  locked={!isNewRow(v.id) && !editingRowIds.has(v.id)}
                  onChange={(updated) => updateVisit(activeTab, v.id, updated)}
                  onRemove={(id) => removeVisit(activeTab, id)}
                  onUnlock={unlockRow}
                  searchableCustomer={activeTab === VISIT_SECTIONS.EXISTING}
                />
              ))}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="w-full inline-flex items-center justify-center gap-1.5 border border-dashed border-[#E5E7EB] text-[#059669] rounded-[12px] px-4 py-3 text-xs font-bold hover:bg-emerald-50/50 transition"
        >
          <Plus size={14} /> Add Visit
        </button>

        {/* Small Summary */}
        <p className="text-xs text-[#6B7280] text-center">
          {totalVisits} Visits · {totalExisting} Existing · {totalProspect} Prospects
        </p>
      </div>

      {showAddModal && (
        <AddVisitModal
          section={activeTab}
          onClose={() => setShowAddModal(false)}
          onSave={(visitData) => {
            addVisit(activeTab, visitData);
            setShowAddModal(false);
          }}
        />
      )}

      {showPreviousPlans && (
        <PreviousPlansModal
          plans={allPlans}
          onClose={() => setShowPreviousPlans(false)}
          onSelect={loadWeekIntoForm}
        />
      )}

      {/* Mobile Sticky Save */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-[#E5E7EB] p-3">
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#059669] text-white rounded-[12px] text-sm font-bold hover:bg-[#0D8A68] transition disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          SAVE WEEKLY PLAN
        </button>
      </div>
    </div>
  );
};

export default WeeklySalesPlan;