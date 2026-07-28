// FILE: admin/src/Pages/modules/sales/roles/KAM/WeeklySalesPlan.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
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
  Users,
  UserPlus,
  ListChecks,
  Clock,
  Search,
  Filter,
  Folder,
   Copy,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "../../../../../Components/hooks/useToast";
import { todayLocalISO } from "../../../../../Components/utils/date";
import {
  VISIT_SECTIONS,
  getWeekStart,
  getWeekEnd,
  formatDateRange,
  buildEmptyVisit,
} from "../../constants/weeklyPlanStatus";
import {
  listPlansForKam, savePlan
} from "../../services/weeklyPlanService";
import { isRequired } from "../../../../../Components/utils/validators";
import CustomerSearchSelect from "../../components/CustomerSearchSelect";

const buildEmptyPlan = (weekStartDate = getWeekStart()) => ({
  id: null,
  weekStartDate,
  existingVisits: [],
  prospectVisits: [],
});

const isNewRow = (id) => typeof id === "string" && id.startsWith("v_");

const computeVisitStatus = (day) => {
  if (!day) return { label: "Planned", cls: "bg-blue-50 text-blue-700 ring-blue-200" };
  const today = new Date(todayLocalISO());
  const d = new Date(day);
  if (d < today) return { label: "Completed", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
  return { label: "Planned", cls: "bg-blue-50 text-blue-700 ring-blue-200" };
};

const TypeBadge = ({ type }) =>
  type === "existing" ? (
    <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-200">
      Existing Client
    </span>
  ) : (
    <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset bg-amber-50 text-amber-700 ring-amber-200">
      Prospect
    </span>
  );

const StatusBadge = ({ day }) => {
  const s = computeVisitStatus(day);
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${s.cls}`}>
      {s.label}
    </span>
  );
};

const KpiCard = ({ icon: Icon, label, value, iconBg = "bg-emerald-50 text-emerald-600" }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center gap-3 min-w-0">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold text-slate-500 truncate">{label}</p>
      <p className="text-xl font-bold text-slate-800 leading-tight">{value}</p>
    </div>
  </div>
);

const VisitTable = ({
  type,
  title,
  visits,
  onAdd,
  onChange,
  onRemove,
  editingRowIds,
  onUnlock,
  searchableCustomer = false,
}) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
    <div className="flex justify-between items-center px-4 sm:px-5 py-4 border-b border-slate-100">
      <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
      <button
        type="button"
        onClick={onAdd}
        className="text-xs font-bold text-emerald-700 flex items-center hover:text-emerald-800 shrink-0"
      >
        <Plus size={14} className="mr-1" /> Add Visit
      </button>
    </div>
    {visits.length === 0 ? (
      <p className="text-xs text-slate-400 px-5 py-6">No visits planned yet.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[720px]">
          <thead className="sticky top-0 bg-slate-50 z-10">
            <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
              <th className="py-2.5 px-4 w-36">Date</th>
              <th className="py-2.5 px-3 w-40">Customer Type</th>
              <th className="py-2.5 px-3">Customer Name</th>
              <th className="py-2.5 px-3">Visit Purpose</th>
              <th className="py-2.5 px-3 w-32">Status</th>
              <th className="py-2.5 px-3 w-24 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visits.map((v, idx) => {
              const locked = !isNewRow(v.id) && !editingRowIds.has(v.id);
              return (
                <tr key={v.id} className={`align-top ${idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"} hover:bg-emerald-50/30 transition-colors`}>
                  <td className="py-2.5 px-4">
                    <input
                      type="date"
                      disabled={locked}
                      className={`w-full border p-2 rounded-lg text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ${
                        locked ? "bg-slate-50 text-slate-500 border-slate-100" : "bg-white border-slate-200"
                      }`}
                      value={v.day}
                      onChange={(e) => onChange({ ...v, day: e.target.value })}
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <TypeBadge type={type} />
                  </td>
                  <td className="py-2.5 px-3">
                    {searchableCustomer && !locked ? (
                      <CustomerSearchSelect
                        value={v.customerName}
                        onSelect={({ customerName, customerId }) => onChange({ ...v, customerName, customerId })}
                      />
                    ) : (
                      <input
                        disabled={locked}
                        className={`w-full border p-2 rounded-lg text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-700 ${
                          locked ? "bg-slate-50 text-slate-500 border-slate-100" : "bg-white border-slate-200"
                        }`}
                        placeholder="Customer name"
                        value={v.customerName}
                        maxLength={200}
                        onChange={(e) => onChange({ ...v, customerName: e.target.value })}
                      />
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      disabled={locked}
                      className={`w-full border p-2 rounded-lg text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ${
                        locked ? "bg-slate-50 text-slate-500 border-slate-100" : "bg-white border-slate-200"
                      }`}
                      placeholder="Purpose of visit"
                      value={v.purpose}
                      maxLength={300}
                      onChange={(e) => onChange({ ...v, purpose: e.target.value })}
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge day={v.day} />
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
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

const MiniCalendar = ({ rangeStart, rangeEnd, isCustom, onPickDay, onManualChange, onReset }) => {
  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);
  const monthDate = new Date(start.getFullYear(), start.getMonth(), 1);
  const monthLabel = monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const cells = useMemo(() => {
    const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart]);

  const toISO = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const isInRange = (d) => d >= start && d <= end;
  const isCurrentMonth = (d) => d.getMonth() === monthDate.getMonth();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-800 text-sm">Mini Calendar</h3>
        <span className="text-[11px] font-semibold text-slate-400">{monthLabel}</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-3">
        {cells.map((d, i) => {
          const iso = toISO(d);
          return (
            <button
              type="button"
              key={i}
              onClick={() => onPickDay(iso)}
              className={`aspect-square flex items-center justify-center text-[11px] rounded-full transition ${
                !isCurrentMonth(d) ? "text-slate-300" : "text-slate-600"
              } ${isInRange(d) ? "bg-emerald-600 text-white font-bold" : "hover:bg-emerald-50"}`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
      <div className="mt-auto space-y-2">
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => onManualChange({ start: e.target.value, end: rangeEnd })}
            className="flex-1 min-w-0 border border-slate-200 rounded-lg text-[11px] px-1.5 py-1.5 outline-none focus:border-emerald-500"
          />
          <span className="text-[10px] text-slate-400 shrink-0">to</span>
          <input
            type="date"
            value={rangeEnd}
            onChange={(e) => onManualChange({ start: rangeStart, end: e.target.value })}
            className="flex-1 min-w-0 border border-slate-200 rounded-lg text-[11px] px-1.5 py-1.5 outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full truncate">
            {formatDateRange(rangeStart, rangeEnd)}
          </span>
          {isCustom && (
            <button
              type="button"
              onClick={onReset}
              className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition shrink-0"
            >
              Reset to Week
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const WeeklySalesPlan = () => {
  const { showToast } = useToast();
  const currentWeekStart = getWeekStart();
  const [plan, setPlan] = useState(buildEmptyPlan(currentWeekStart));
  const [allPlans, setAllPlans] = useState([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [editingRowIds, setEditingRowIds] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSearch, setSavedSearch] = useState("");
  const [savedPage, setSavedPage] = useState(1);
  const [filterRange, setFilterRange] = useState(null);
  const [pendingStart, setPendingStart] = useState(null);
  const SAVED_PAGE_SIZE = 4;

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const plans = await listPlansForKam();
      setAllPlans(plans);
      const existingForWeek = plans.find((p) => p.weekStartDate === currentWeekStart);
      setPlan(existingForWeek || buildEmptyPlan(currentWeekStart));
      setEditingRowIds(new Set());
      setFilterRange(null);
      setPendingStart(null);
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
    setFilterRange(null);
    setPendingStart(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToCurrentWeek = () => {
    const existingForWeek = allPlans.find((p) => p.weekStartDate === currentWeekStart);
    loadWeekIntoForm(existingForWeek || buildEmptyPlan(currentWeekStart));
  };

  const duplicateLastWeek = () => {
    const prior = allPlans
      .filter((p) => p.weekStartDate < currentWeekStart)
      .sort((a, b) => (a.weekStartDate < b.weekStartDate ? 1 : -1))[0];
    if (!prior) {
      showToast("No previous week found to duplicate", "warning");
      return;
    }
    setPlan((prev) => ({
      ...prev,
      existingVisits: prior.existingVisits.map((v) => ({ ...v, id: `v_${crypto.randomUUID()}` })),
      prospectVisits: prior.prospectVisits.map((v) => ({ ...v, id: `v_${crypto.randomUUID()}` })),
    }));
    setEditingRowIds(new Set());
    showToast("Copied last week's visits into this week (unsaved)", "success");
  };

const exportExcel = () => {
    const rows = [
      ...plan.existingVisits.map((v) => ({
        Date: v.day,
        "Customer Type": "Existing Client",
        "Customer Name": v.customerName,
        "Visit Purpose": v.purpose,
      })),
      ...plan.prospectVisits.map((v) => ({
        Date: v.day,
        "Customer Type": "Prospect",
        "Customer Name": v.customerName,
        "Visit Purpose": v.purpose,
      })),
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Weekly Plan");
    XLSX.writeFile(wb, `weekly-plan-${plan.weekStartDate}.xlsx`);
  };

  const handlePickDay = (iso) => {
    if (!pendingStart) {
      setPendingStart(iso);
      setFilterRange({ start: iso, end: iso });
      return;
    }
    const start = iso < pendingStart ? iso : pendingStart;
    const end = iso < pendingStart ? pendingStart : iso;
    setFilterRange({ start, end });
    setPendingStart(null);
  };

  const handleManualRangeChange = (range) => {
    setFilterRange(range);
    setPendingStart(null);
  };

  const handleResetRange = () => {
    setFilterRange(null);
    setPendingStart(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-400 gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading weekly plan...
      </div>
    );
  }

  const isEditingCurrentWeek = plan.weekStartDate === currentWeekStart;
  const totalExisting = plan.existingVisits.length;
  const totalProspect = plan.prospectVisits.length;
  const totalVisitsCount = totalExisting + totalProspect;

  const rangeStart = filterRange?.start || plan.weekStartDate;
  const rangeEnd = filterRange?.end || getWeekEnd(plan.weekStartDate);
  const isCustomRange = !!filterRange;
  const inRange = (day) => !!day && day >= rangeStart && day <= rangeEnd;
  const filteredExistingVisits = plan.existingVisits.filter((v) => inRange(v.day));
  const filteredProspectVisits = plan.prospectVisits.filter((v) => inRange(v.day));

  const filteredSavedPlans = allPlans.filter((p) => {
    if (!savedSearch.trim()) return true;
    return formatDateRange(p.weekStartDate, getWeekEnd(p.weekStartDate)).toLowerCase().includes(savedSearch.toLowerCase());
  });
  const savedTotalPages = Math.max(1, Math.ceil(filteredSavedPlans.length / SAVED_PAGE_SIZE));
  const savedPageClamped = Math.min(savedPage, savedTotalPages);
  const pagedSavedPlans = filteredSavedPlans.slice(
    (savedPageClamped - 1) * SAVED_PAGE_SIZE,
    savedPageClamped * SAVED_PAGE_SIZE
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-5 sm:py-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Weekly Sales Planning</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Plan customer visits for the selected week.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={goToCurrentWeek}
              disabled={isEditingCurrentWeek}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 bg-white px-3 py-2.5 rounded-lg hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CalendarRange size={14} /> {formatDateRange(plan.weekStartDate, getWeekEnd(plan.weekStartDate))}
              <ChevronDown size={14} />
            </button>
            {!isEditingCurrentWeek && (
              <button
                type="button"
                onClick={goToCurrentWeek}
                className="text-xs font-bold text-slate-600 border border-slate-200 bg-white px-3 py-2.5 rounded-lg flex items-center hover:bg-slate-50 transition"
              >
                <RotateCcw size={13} className="mr-1.5" /> Current Week
              </button>
            )}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-800 transition disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Plan
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard icon={Users} label="Existing Client Visits" value={totalExisting} />
          <KpiCard icon={UserPlus} label="Prospect Visits" value={totalProspect} iconBg="bg-amber-50 text-amber-600" />
          <KpiCard icon={ListChecks} label="Total Planned Visits" value={totalVisitsCount} />
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500 truncate">Current Week Status</p>
              <span className="inline-flex mt-0.5 items-center rounded-full px-2 py-0.5 text-[11px] font-bold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200">
                {isEditingCurrentWeek ? "In Progress" : "Viewing"}
              </span>
            </div>
          </div>
        </div>

        {/* Main grid: content + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-5 min-w-0">
            <VisitTable
              type="existing"
              title="Existing Client Visits"
              visits={filteredExistingVisits}
              editingRowIds={editingRowIds}
              onUnlock={unlockRow}
              searchableCustomer
              onAdd={() => addVisit(VISIT_SECTIONS.EXISTING)}
              onChange={(updated) => updateVisit(VISIT_SECTIONS.EXISTING, updated.id, updated)}
              onRemove={(id) => removeVisit(VISIT_SECTIONS.EXISTING, id)}
            />
            <VisitTable
              type="prospect"
              title="Prospect Client Visits"
              visits={filteredProspectVisits}
              editingRowIds={editingRowIds}
              onUnlock={unlockRow}
              onAdd={() => addVisit(VISIT_SECTIONS.PROSPECT)}
              onChange={(updated) => updateVisit(VISIT_SECTIONS.PROSPECT, updated.id, updated)}
              onRemove={(id) => removeVisit(VISIT_SECTIONS.PROSPECT, id)}
            />
          </div>

          <div className="lg:col-span-4 space-y-5 min-w-0">
            {/* Week Summary */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
              <h3 className="font-bold text-slate-800 text-sm mb-3">Week Summary</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-slate-800">{totalExisting}</p>
                  <p className="text-[10px] font-semibold text-slate-500">Existing Visits</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">{totalProspect}</p>
                  <p className="text-[10px] font-semibold text-slate-500">Prospect Visits</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">{totalVisitsCount}</p>
                  <p className="text-[10px] font-semibold text-slate-500">Total Visits</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              <MiniCalendar
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                isCustom={isCustomRange}
                onPickDay={handlePickDay}
                onManualChange={handleManualRangeChange}
                onReset={handleResetRange}
              />

              {/* Quick Actions */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4 space-y-2 flex flex-col h-full">
                <h3 className="font-bold text-slate-800 text-sm mb-1">Quick Actions</h3>
                <button
                  type="button"
                  onClick={() => addVisit(VISIT_SECTIONS.EXISTING)}
                  className="w-full inline-flex items-center gap-2 justify-center text-xs font-bold text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition"
                >
                  <Plus size={14} /> Add Existing Client
                </button>
                <button
                  type="button"
                  onClick={() => addVisit(VISIT_SECTIONS.PROSPECT)}
                  className="w-full inline-flex items-center gap-2 justify-center text-xs font-bold text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition"
                >
                  <Plus size={14} /> Add Prospect
                </button>
                <button
                  type="button"
                  onClick={duplicateLastWeek}
                  className="w-full inline-flex items-center gap-2 justify-center text-xs font-bold text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition"
                >
                  <Copy size={14} /> Duplicate Last Week
                </button>
                <button
                  type="button"
                  onClick={exportExcel}
                  className="w-full inline-flex items-center gap-2 justify-center text-xs font-bold text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition"
                >
                  <FileSpreadsheet size={14} /> Export Excel
                </button>
              </div>
            </div>

            {/* Saved Plans */}
            {allPlans.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <div className="p-4 pb-2 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">Saved Plans</h3>
                </div>
                <div className="px-4 pb-3 flex items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={savedSearch}
                      onChange={(e) => {
                        setSavedSearch(e.target.value);
                        setSavedPage(1);
                      }}
                      maxLength={100}
                      placeholder="Search week..."
                      className="w-full pl-7 pr-2 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 border border-slate-200 rounded-lg px-2.5 py-2 hover:bg-slate-50 transition shrink-0"
                  >
                    <Filter size={12} /> Filter
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {pagedSavedPlans.map((p) => {
                    const totalVisits = p.existingVisits.length + p.prospectVisits.length;
                    const isActive = p.weekStartDate === plan.weekStartDate;
                    return (
                      <div key={p.id} className={isActive ? "bg-emerald-50/40" : ""}>
                        <div className="w-full flex justify-between items-center px-4 py-3 gap-2">
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
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => loadWeekIntoForm(p)}
                              aria-label="Open this week's plan"
                              className="w-7 h-7 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition inline-flex items-center justify-center"
                            >
                              <Folder size={13} />
                            </button>
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
                              onClick={() => setExpandedHistoryId(expandedHistoryId === p.id ? null : p.id)}
                              aria-label="Toggle details"
                              className="w-7 h-7 rounded-full text-slate-300 hover:text-slate-600 transition inline-flex items-center justify-center"
                            >
                              {expandedHistoryId === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </div>
                        {expandedHistoryId === p.id && (
                          <div className="px-4 pb-4 space-y-3">
                            {totalVisits === 0 ? (
                              <p className="text-xs text-slate-400">No visits in this plan.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[320px] text-xs">
                                  <thead>
                                    <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
                                      <th className="py-2 pr-3 w-28">Date</th>
                                      <th className="py-2 pr-3">Customer Name</th>
                                      <th className="py-2">Purpose</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {[...p.existingVisits, ...p.prospectVisits].map((v) => (
                                      <tr key={v.id}>
                                        <td className="py-2 pr-3 font-bold text-slate-700 w-28">
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
                  {pagedSavedPlans.length === 0 && (
                    <p className="text-xs text-slate-400 px-4 py-4">No matching weeks found.</p>
                  )}
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400">
                    Page {savedPageClamped} of {savedTotalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={savedPageClamped <= 1}
                      onClick={() => setSavedPage((p) => Math.max(1, p - 1))}
                      className="w-7 h-7 rounded-full border border-slate-200 text-slate-500 inline-flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 transition"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={savedPageClamped >= savedTotalPages}
                      onClick={() => setSavedPage((p) => Math.min(savedTotalPages, p + 1))}
                      className="w-7 h-7 rounded-full border border-slate-200 text-slate-500 inline-flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 transition"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklySalesPlan;