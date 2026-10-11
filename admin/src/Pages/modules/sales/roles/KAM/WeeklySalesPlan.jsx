// FILE: admin/src/Pages/modules/sales/roles/KAM/WeeklySalesPlan.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Trash2, Save, Pencil, Loader2, X, CalendarCheck, Lock, FileSpreadsheet } from "lucide-react";
import WeeklyPlanImportModal from "./WeeklyPlanImportModal";
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
import { useConfirm } from "../../../../../Components/hooks/useConfirm";

const buildEmptyPlan = (weekStartDate = getWeekStart()) => ({
  id: null,
  weekStartDate,
  existingVisits: [],
  prospectVisits: [],
  loadedAt: new Date().toISOString(),
});

const isNewRow = (id) => typeof id === "string" && id.startsWith("v_");

const VISIT_STATUS_STYLES = {
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Skipped: "bg-red-50 text-red-600 ring-red-200",
  "Not Updated": "bg-amber-50 text-amber-700 ring-amber-200",
  Planned: "bg-slate-100 text-slate-600 ring-slate-200",
};

// "Not Updated" is the day closing on a visit nobody answered — distinct from
// a skip, which is a decision somebody made and gave a reason for.
const StatusBadge = ({ v }) => {
  const label = v.autoClosed
    ? "Not Updated"
    : v.completed === true
      ? "Completed"
      : v.completed === false
        ? "Skipped"
        : "Planned";
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
    if (day < todayLocalISO()) {
      showToast("That date has already passed. Visits can only be planned from today onwards.", "warning", 6000);
      return;
    }
    onSave({
      ...buildEmptyVisit(day),
      customerName: customerName.trim(),
      customerId,
      purpose: purpose.trim(),
    });
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
            min={todayLocalISO()}
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

// Only weeks other than the current one are listed here — the current week
// is always one tap away via the "Current Week" button and is what the page
// opens on, so repeating it in this list was only ever confusing.
const PreviousPlansModal = ({ plans, currentWeekStart, onClose, onSelect }) => {
  const previous = plans.filter((p) => p.weekStartDate !== currentWeekStart);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-[12px] p-5 space-y-3 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#111827] text-sm">Previous Plans</h3>
            <p className="text-[10px] text-[#6B7280] mt-0.5">Past weeks are shown for reference and can't be edited.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto divide-y divide-[#E5E7EB]">
          {previous.length === 0 && <p className="text-xs text-[#6B7280] py-4">No previous plans yet.</p>}
          {previous.map((p) => {
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
};

const VisitRowCard = ({ v, locked, readOnly = false, onChange, onRemove, onUnlock, searchableCustomer }) => (
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
        {!readOnly && locked && (
          <button type="button" onClick={() => onUnlock(v.id)} className="text-slate-300 hover:text-[#059669] transition" aria-label="Edit">
            <Pencil size={14} />
          </button>
        )}
        {!readOnly && (
          <button type="button" onClick={() => onRemove(v)} className="text-slate-300 hover:text-red-500 transition" aria-label="Delete">
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

    {!isNewRow(v.id) && (
      <div className="space-y-1.5">
        <StatusBadge v={v} />
        {v.completed === false && (
          <p className={`text-[11px] break-words ${v.autoClosed ? 'text-amber-700' : 'text-red-600'}`}>
            <span className={`font-semibold ${v.autoClosed ? 'text-amber-800' : 'text-red-700'}`}>
              {v.autoClosed ? 'Closed automatically: ' : 'Reason for skipping: '}
            </span>
            {v.reasonIfNotCompleted || 'No reason recorded'}
          </p>
        )}
        {v.completed === true && (
          <p className="text-[11px] text-[#6B7280] break-words">
            <span className="font-semibold text-[#111827]">Outcome: </span>
            {v.outcomeNotes || 'No notes added'}
          </p>
        )}
      </div>
    )}
  </div>
);

const WeeklySalesPlan = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const currentWeekStart = getWeekStart();
  const [plan, setPlan] = useState(buildEmptyPlan(currentWeekStart));
  const [allPlans, setAllPlans] = useState([]);
  const [editingRowIds, setEditingRowIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveLockRef = useRef(false);
  const [activeTab, setActiveTab] = useState(VISIT_SECTIONS.EXISTING);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPreviousPlans, setShowPreviousPlans] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const plans = await listPlansForKam();
      const loadedAt = new Date().toISOString();
      setAllPlans(plans);
      const existingForWeek = plans.find((p) => p.weekStartDate === currentWeekStart);
      setPlan(
        existingForWeek ? { ...existingForWeek, loadedAt } : buildEmptyPlan(currentWeekStart)
      );
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

  // Completed, skipped and not-updated all come from the Daily Visiting
  // Report, usually filled in on another page. Coming back to this one pulls
  // those outcomes in again — and only those, so anything being typed here
  // is never thrown away by a refresh.
  const refreshOutcomes = useCallback(async () => {
    try {
      const plans = await listPlansForKam();
      setAllPlans(plans);
      setPlan((prev) => {
        const fresh = plans.find((p) => p.weekStartDate === prev.weekStartDate);
        if (!fresh) return prev;
        const byId = new Map([...fresh.existingVisits, ...fresh.prospectVisits].map((v) => [v.id, v]));
        const merge = (v) => {
          const f = byId.get(v.id);
          return f
            ? {
                ...v,
                completed: f.completed,
                outcomeNotes: f.outcomeNotes,
                reasonIfNotCompleted: f.reasonIfNotCompleted,
                autoClosed: f.autoClosed,
              }
            : v;
        };
        return { ...prev, existingVisits: prev.existingVisits.map(merge), prospectVisits: prev.prospectVisits.map(merge) };
      });
    } catch {
      /* the next visit to the page will try again */
    }
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshOutcomes();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refreshOutcomes]);



  // Saves the visit to the server immediately when added from the modal,
  // instead of leaving it only in local state until the person separately
  // presses "Save Weekly Plan". AddVisitModal already validates date/name/
  // purpose before calling this, so it's safe to persist right away.
  const addVisitAndSave = async (section, visitData) => {
    if (saveLockRef.current) return;
    saveLockRef.current = true;
    // Existing Clients holds only customers the system knows. A name typed on
    // that tab that matches no customer record is a prospect, and is filed
    // there — the person is told, so it does not look as though it vanished.
    const targetSection = visitData.customerId ? VISIT_SECTIONS.EXISTING : VISIT_SECTIONS.PROSPECT;
    const movedToProspect = section === VISIT_SECTIONS.EXISTING && targetSection === VISIT_SECTIONS.PROSPECT;
    const key = targetSection === VISIT_SECTIONS.EXISTING ? "existingVisits" : "prospectVisits";
    const updatedPlan = { ...plan, [key]: [...plan[key], visitData] };
    setIsSaving(true);
    try {
      const sanitizedPlan = {
        ...updatedPlan,
        existingVisits: updatedPlan.existingVisits.map(sanitizeVisit),
        prospectVisits: updatedPlan.prospectVisits.map(sanitizeVisit),
      };
      const saved = await savePlan(sanitizedPlan);
      setPlan({ ...saved, loadedAt: new Date().toISOString() });
      setEditingRowIds(new Set());
      setAllPlans((prev) => {
        const others = prev.filter((p) => p.weekStartDate !== saved.weekStartDate);
        return [saved, ...others].sort((a, b) => (a.weekStartDate < b.weekStartDate ? 1 : -1));
      });
      setActiveTab(targetSection);
      showToast(
        movedToProspect
          ? `${visitData.customerName} isn't a customer in the system yet, so the visit was added under Prospects.`
          : "Visit added",
        movedToProspect ? "info" : "success",
        movedToProspect ? 7000 : undefined
      );
    } catch (err) {
      showToast(err?.message || "Failed to add visit", "error");
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const updateVisit = (section, id, updated) => {
    const key = section === VISIT_SECTIONS.EXISTING ? "existingVisits" : "prospectVisits";
    setPlan((prev) => ({ ...prev, [key]: prev[key].map((v) => (v.id === id ? updated : v)) }));
  };

  // A saved visit could never be removed, only edited — the delete control was
  // limited to rows that had not been written yet, so a visit added by mistake
  // stayed on the plan for good. A saved row is confirmed first because
  // removing it also detaches whatever the Daily Report recorded against it.
  // A visit that has already been reported on is a record of what happened,
  // not a plan — the server refuses to change it either way, so the controls
  // are withheld rather than offering an action that silently does nothing.
  const isReported = (v) => v.completed === true || v.completed === false;

  const removeVisit = async (section, visit) => {
    const key = section === VISIT_SECTIONS.EXISTING ? "existingVisits" : "prospectVisits";
    if (isReported(visit)) {
      return showToast(
        "This visit has already been completed or skipped in a Daily Visiting Report, so it can't be removed.",
        "warning",
        6000
      );
    }
    if (!isNewRow(visit.id)) {
      const ok = await confirm({
        title: "Remove this visit?",
        message: `${visit.customerName || "This visit"} will be taken off the plan. Anything already recorded for it in a Daily Visiting Report stays, but will no longer be linked here.`,
        confirmLabel: "Remove visit",
        tone: "danger",
      });
      if (!ok) return;
    }
    setPlan((prev) => ({ ...prev, [key]: prev[key].filter((v) => v.id !== visit.id) }));
    if (!isNewRow(visit.id)) {
      showToast("Removed — press Save Weekly Plan to confirm it", "info", 5000);
    }
  };

  const unlockRow = (id) => setEditingRowIds((prev) => new Set(prev).add(id));

  // Only what the person has added or opened for editing is checked. Visits
  // that arrived from the Daily Visiting Report often carry no purpose, and
  // checking every row meant a save could fail on a visit nobody touched.
  const validate = () => {
    const today = todayLocalISO();
    const savedPlan = allPlans.find((p) => p.weekStartDate === plan.weekStartDate);
    const savedDayById = new Map(
      [...(savedPlan?.existingVisits || []), ...(savedPlan?.prospectVisits || [])].map((v) => [v.id, v.day])
    );
    const touched = [...plan.existingVisits, ...plan.prospectVisits].filter(
      (v) => isNewRow(v.id) || editingRowIds.has(v.id)
    );
    const incomplete = touched.find(
      (v) => !isRequired(v.customerName) || !isRequired(v.purpose) || !isRequired(v.day)
    );
    if (incomplete) {
      showToast(`${incomplete.customerName?.trim() || "A visit"} needs a date, customer name and purpose`, "warning");
      return false;
    }
    const past = touched.find((v) => v.day < today && savedDayById.get(v.id) !== v.day);
    if (past) {
      showToast(
        `${past.customerName || "A visit"} is dated ${past.day}, which has already passed. Pick today or a later date.`,
        "warning",
        6000
      );
      return false;
    }
    return true;
  };

// Only the fields the server's schema accepts, and nothing else. The visit
// objects held here also carry display-only state — completion status, the
// unlock flag, the outcome pulled from the daily report — and a strict
// schema rejects the whole save if any of that travels with it.
const sanitizeVisit = (v) => ({
    id: v.id,
    day: v.day || "",
    customerName: v.customerName || "",
    customerId: v.customerId ?? null,
    purpose: v.purpose || "",
    outcomeNotes: v.outcomeNotes ?? undefined,
  });

  const handleSave = async () => {
    if (saveLockRef.current) return;
    if (!validate()) return;
    saveLockRef.current = true;
    setIsSaving(true);
    try {
      const sanitizedPlan = {
        ...plan,
        existingVisits: plan.existingVisits.map(sanitizeVisit),
        prospectVisits: plan.prospectVisits.map(sanitizeVisit),
      };
      const saved = await savePlan(sanitizedPlan);
      // A row edited on the existing tab to a name with no customer record
      // is filed under Prospects by the server; say so rather than let it
      // quietly disappear from the list being looked at.
      const moved = plan.existingVisits.filter((v) => !v.customerId).length;
      // The response is the authoritative state, so the freshness marker
      // restarts from this moment rather than the original page load.
      setPlan({ ...saved, loadedAt: new Date().toISOString() });
      setEditingRowIds(new Set());
      setAllPlans((prev) => {
        const others = prev.filter((p) => p.weekStartDate !== saved.weekStartDate);
        return [saved, ...others].sort((a, b) => (a.weekStartDate < b.weekStartDate ? 1 : -1));
      });
      showToast(
        moved > 0
          ? `Weekly plan saved. ${moved} visit(s) didn't match a customer in the system and were moved to Prospects.`
          : "Weekly plan saved",
        moved > 0 ? "info" : "success",
        moved > 0 ? 7000 : undefined
      );
    } catch (err) {
      showToast(err?.message || "Failed to save plan", "error");
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  // Imported rows are saved immediately, in one write, for the same reason a
  // visit added from the modal is: a spreadsheet the person just uploaded
  // sitting only in the browser is a plan they think they have and don't.
  const importVisits = async ({ existing: importedExisting, prospect: importedProspect }) => {
    if (saveLockRef.current) return;
    setShowImport(false);
    if (importedExisting.length === 0 && importedProspect.length === 0) return;

    // The same rule as adding by hand, checked before anything is sent so a
    // file with one bad row is refused whole rather than half-imported.
    const today = todayLocalISO();
    const past = [...importedExisting, ...importedProspect].filter((v) => !v.day || v.day < today);
    if (past.length > 0) {
      showToast(
        `${past.length} row(s) in the file are dated before today — for example ${past[0].customerName || "a visit"} on ${past[0].day || "no date"}. Visits can only be planned from today onwards. Correct the file and import it again.`,
        "error",
        9000
      );
      return;
    }

    // Sorted by the customer record, not by which sheet a row was on: only
    // customers the system knows go under Existing Clients.
    const allImported = [...importedExisting, ...importedProspect];
    const existing = allImported.filter((v) => v.customerId);
    const prospect = allImported.filter((v) => !v.customerId);

    saveLockRef.current = true;
    setIsSaving(true);
    try {
      const merged = {
        ...plan,
        existingVisits: [...plan.existingVisits, ...existing].map(sanitizeVisit),
        prospectVisits: [...plan.prospectVisits, ...prospect].map(sanitizeVisit),
      };
      const saved = await savePlan(merged);
      setPlan({ ...saved, loadedAt: new Date().toISOString() });
      setEditingRowIds(new Set());
      setAllPlans((prev) => {
        const others = prev.filter((p) => p.weekStartDate !== saved.weekStartDate);
        return [saved, ...others].sort((a, b) => (a.weekStartDate < b.weekStartDate ? 1 : -1));
      });
      showToast(
        `${existing.length + prospect.length} visit(s) imported — ${existing.length} existing, ${prospect.length} prospect`,
        'success',
        7000
      );
    } catch (err) {
      showToast(err?.message || 'Could not import the plan', 'error');
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const loadWeekIntoForm = (p) => {
    setPlan({ ...p, loadedAt: new Date().toISOString() });
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

  // A past week is a record of what happened, not a plan to change. Making
  // it read-only removes the whole class of "I edited last week by mistake"
  // problems, and makes it obvious that adding a visit belongs to the week
  // currently being planned.
  const isEditingCurrentWeek = plan.weekStartDate === currentWeekStart;
  const isReadOnly = !isEditingCurrentWeek;
  const totalExisting = plan.existingVisits.length;
  const totalProspect = plan.prospectVisits.length;
  const totalVisits = totalExisting + totalProspect;
  // Always in date order. A copy is sorted, so the order rows were added in
  // is left alone in state and nothing shifts under the person while typing.
  const activeVisits = [
    ...(activeTab === VISIT_SECTIONS.EXISTING ? plan.existingVisits : plan.prospectVisits),
  ].sort((a, b) => (a.day || "").localeCompare(b.day || ""));

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
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111827] border border-[#E5E7EB] bg-white px-3 py-2 rounded-[10px]">
                {formatDateRange(plan.weekStartDate, getWeekEnd(plan.weekStartDate))}
              </span>
              {isEditingCurrentWeek ? (
                <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1.5 text-[10px] font-bold bg-[#059669] text-white">
                  Current Week
                </span>
              ) : (
                <button
                  type="button"
                  onClick={goToCurrentWeek}
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-bold bg-[#059669] text-white hover:bg-[#0D8A68] transition"
                >
                  <CalendarCheck size={12} /> Go to Current Week
                </button>
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
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setShowImport(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#E5E7EB] bg-white text-[#0D8A68] rounded-[10px] text-xs font-bold hover:bg-emerald-50/50 transition"
                >
                  <FileSpreadsheet size={13} /> Import from Excel
                </button>
              )}
              {!isReadOnly && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSave}
                  className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 bg-[#059669] text-white rounded-[10px] text-xs font-bold hover:bg-[#0D8A68] transition disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Weekly Plan
                </button>
              )}
            </div>
          </div>
        </div>

        {isReadOnly && (
          <div className="flex items-center gap-2 bg-slate-100 border border-[#E5E7EB] rounded-[12px] px-4 py-2.5">
            <Lock size={13} className="text-[#6B7280] shrink-0" />
            <p className="text-xs text-[#6B7280]">
              You're viewing a past week. Visits can only be added or changed in the current week.
            </p>
          </div>
        )}

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
                    <th className="py-2.5 px-3">Outcome / Reason</th>
                    <th className="py-2.5 px-3 w-20 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {activeVisits.map((v) => {
                    const reported = isReported(v);
                    const locked = isReadOnly || reported || (!isNewRow(v.id) && !editingRowIds.has(v.id));
                    return (
                      <tr key={v.id} className="align-top">
                        <td className="py-2.5 px-4">
                          {locked ? (
                            <span className="text-xs text-[#111827] font-medium">{formatDay(v.day)}</span>
                          ) : (
                            <input
                              type="date"
                              min={todayLocalISO()}
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
                        {/* Filled in from the Daily Visiting Report for this
                            date — the plan itself holds no outcome, so this
                            is the only place the two views meet. */}
                        <td className="py-2.5 px-3 text-xs">
                          {v.autoClosed ? (
                            <span className="text-amber-700 break-words">{v.reasonIfNotCompleted || 'Not updated by the end of the day'}</span>
                          ) : v.completed === false ? (
                            <span className="text-red-600 break-words">{v.reasonIfNotCompleted || 'No reason recorded'}</span>
                          ) : v.completed === true ? (
                            <span className="text-[#6B7280] break-words">{v.outcomeNotes || 'No notes added'}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {!isReadOnly && !reported && locked && (
                            <button
                              type="button"
                              onClick={() => unlockRow(v.id)}
                              className="text-slate-300 hover:text-[#059669] transition mr-2"
                              aria-label="Edit"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {!isReadOnly && !reported && (
                            <button
                              type="button"
                              onClick={() => removeVisit(activeTab, v)}
                              className="text-slate-300 hover:text-red-500 transition"
                              aria-label="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                          {(isReadOnly || reported) && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                              <Lock size={11} /> {reported ? 'Reported' : '—'}
                            </span>
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
                  readOnly={isReadOnly || isReported(v)}
                  locked={isReadOnly || isReported(v) || (!isNewRow(v.id) && !editingRowIds.has(v.id))}
                  onChange={(updated) => updateVisit(activeTab, v.id, updated)}
                  onRemove={(visit) => removeVisit(activeTab, visit)}
                  onUnlock={unlockRow}
                  searchableCustomer={activeTab === VISIT_SECTIONS.EXISTING}
                />
              ))}
            </div>
          </>
        )}

        {!isReadOnly && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 border border-dashed border-[#E5E7EB] text-[#059669] rounded-[12px] px-4 py-3 text-xs font-bold hover:bg-emerald-50/50 transition"
          >
            <Plus size={14} /> Add Visit
          </button>
        )}

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
            setShowAddModal(false);
            addVisitAndSave(activeTab, visitData);
          }}
        />
      )}

      {showImport && (
        <WeeklyPlanImportModal onClose={() => setShowImport(false)} onImport={importVisits} />
      )}

      {showPreviousPlans && (
        <PreviousPlansModal
          plans={allPlans}
          currentWeekStart={currentWeekStart}
          onClose={() => setShowPreviousPlans(false)}
          onSelect={loadWeekIntoForm}
        />
      )}

      {/* Mobile Sticky Save / Return */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-[#E5E7EB] p-3">
        {isReadOnly ? (
          <button
            type="button"
            onClick={goToCurrentWeek}
            className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#059669] text-white rounded-[12px] text-sm font-bold hover:bg-[#0D8A68] transition"
          >
            <CalendarCheck size={16} /> GO TO CURRENT WEEK
          </button>
        ) : (
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#059669] text-white rounded-[12px] text-sm font-bold hover:bg-[#0D8A68] transition disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            SAVE WEEKLY PLAN
          </button>
        )}
      </div>
    </div>
  );
};

export default WeeklySalesPlan;