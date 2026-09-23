// src/Pages/modules/operations/pages/DomesticAdmin/TrackShipment.jsx
// (Same structural layout reused verbatim in ForeignAdmin & OperationsHead & Client TrackShipment.jsx)
import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, AlertTriangle } from "lucide-react";
import SectionCard from "../../components/SectionCard";
import StatusTimeline from "../../components/StatusTimeline";
import HorizontalStageTracker from "../../components/HorizontalStageTracker";
import WaitingForBadge from "../../components/WaitingForBadge";
import {
  getSequenceForMode,
  getStatusIndex,
  getExceptionLabel,
} from "../../constants/shipmentStatus";
import { fetchShipmentByAwb, correctShipmentWeight } from "../../services/shipmentService";
import { useOperationsAuth } from "../../hooks/useOperationsAuth";
import { OPERATIONS_ROLES } from "../../constants/operationsRoles";
import { isRequired, isPositiveNumber } from "../../../../../Components/utils/validators";

const WEIGHT_CORRECTION_ROLES = [
  OPERATIONS_ROLES.DOMESTIC_ADMIN,
  OPERATIONS_ROLES.FOREIGN_ADMIN,
  OPERATIONS_ROLES.OPERATIONS_HEAD,
];

const TrackShipment = () => {
  const { currentUser } = useOperationsAuth();
  const canCorrectWeight = WEIGHT_CORRECTION_ROLES.includes(currentUser?.role);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [shipment, setShipment] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [weightReason, setWeightReason] = useState("");
  const [isSavingWeight, setIsSavingWeight] = useState(false);

  const handleSearch = useCallback(
    async (e) => {
      e.preventDefault();
      if (!isRequired(query)) {
        setSearchError("Enter an AWB / CN number to track");
        return;
      }
      setIsSearching(true);
      setSearchError(null);
      setHasSearched(true);
      try {
        const found = await fetchShipmentByAwb(query.trim());
        setShipment(found);
        if (!found)
          setSearchError("No shipment found for this AWB / CN number");
      } catch {
        setShipment(null);
        setSearchError("Failed to search. Please try again.");
      } finally {
        setIsSearching(false);
      }
    },
    [query],
  );

  const handleSaveWeight = async () => {
    if (!isPositiveNumber(newWeight)) return setSearchError(null) || alert("Enter a valid weight");
    setIsSavingWeight(true);
    try {
      const updated = await correctShipmentWeight(shipment.awbNumber, newWeight, weightReason, currentUser?.name);
      setShipment(updated);
      setShowWeightForm(false);
      setNewWeight("");
      setWeightReason("");
    } catch (err) {
      alert(err?.message || "Failed to correct weight");
    } finally {
      setIsSavingWeight(false);
    }
  };

  const sequence = shipment ? getSequenceForMode(shipment.shipmentMode) : [];
  const currentIndex = shipment
    ? getStatusIndex(shipment.shipmentMode, shipment.statusCode)
    : -1;

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">
          Real-Time Tracking
        </h1>
        <p className="text-sm text-slate-500">
          Track a shipment by AWB / CN number.
        </p>
      </div>

      <SectionCard title="Search Shipment">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter AWB / CN number"
            maxLength={30}
            className="flex-1 border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Search size={16} /> {isSearching ? "Searching..." : "Track"}
          </button>
        </form>
        {searchError && (
          <p className="text-xs text-red-600 font-semibold mt-2">
            {searchError}
          </p>
        )}
      </SectionCard>

      {shipment && (
        <>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/operations/documents/awb/${encodeURIComponent(shipment.awbNumber)}`}
              className="text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition"
            >
              View AWB
            </Link>
            <Link
              to={`/operations/documents/label/${encodeURIComponent(shipment.awbNumber)}`}
              className="text-xs font-bold bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-900 transition"
            >
              Print Label
            </Link>
            <Link
              to={`/operations/documents/invoice/${encodeURIComponent(shipment.awbNumber)}`}
              className="text-xs font-bold bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 transition"
            >
              View Invoice
            </Link>
            {shipment.pod && (
              <Link
                to={`/operations/documents/pod/${encodeURIComponent(shipment.awbNumber)}`}
                className="text-xs font-bold bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 transition"
              >
                View POD
              </Link>
            )}
          </div>

          {shipment.exceptionCode && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle
                size={18}
                className="text-red-500 shrink-0 mt-0.5"
              />
              <div>
                <p className="text-sm font-bold text-red-700">
                  Exception Flagged
                </p>
                <p className="text-xs text-red-500">
                  {getExceptionLabel(shipment.exceptionCode)}
                </p>
              </div>
            </div>
          )}

          <SectionCard
            title={`Shipment ${shipment.awbNumber}`}
            subtitle={`${shipment.shipmentMode} · Ref: ${shipment.refNo || "—"}`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-4">
              <p className="text-xs text-slate-500">
                <span className="font-bold text-slate-700">From:</span>{" "}
                {shipment.pickup?.companyName}, {shipment.pickup?.country}
              </p>
              <p className="text-xs text-slate-500">
                <span className="font-bold text-slate-700">To:</span>{" "}
                {shipment.receiver?.companyName}, {shipment.receiver?.country}
              </p>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>
                  <span className="font-bold text-slate-700">Weight:</span>{" "}
                  {shipment.parcel?.weightKg} kg
                  {(shipment.weightCorrections || []).length > 0 && (
                    <span className="text-amber-600 font-semibold ml-1">(corrected)</span>
                  )}
                </span>
                {canCorrectWeight && (
                  <button
                    type="button"
                    onClick={() => { setShowWeightForm((v) => !v); setNewWeight(String(shipment.parcel?.weightKg || "")); }}
                    className="text-[10px] font-bold text-emerald-600 hover:underline"
                  >
                    Correct Weight
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">
                <span className="font-bold text-slate-700">
                  Current Status:
                </span>{" "}
                {shipment.statusLabel}
              </p>
            </div>
            <div className="mb-4">
              <WaitingForBadge
                mode={shipment.shipmentMode}
                statusCode={shipment.statusCode}
                exceptionCode={shipment.exceptionCode}
              />
            </div>
            {showWeightForm && canCorrectWeight && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                <p className="text-[10px] font-bold text-amber-700 uppercase">Weight Correction by MILEX Operations</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="Corrected weight (kg)"
                    className="border border-slate-300 rounded-lg p-2 text-xs bg-white focus:border-emerald-500 outline-none w-40"
                  />
                  <input
                    type="text"
                    value={weightReason}
                    onChange={(e) => setWeightReason(e.target.value)}
                    placeholder="Reason (e.g. re-weighed at hub)"
                    maxLength={200}
                    className="border border-slate-300 rounded-lg p-2 text-xs bg-white focus:border-emerald-500 outline-none flex-1 min-w-[160px]"
                  />
                  <button type="button" disabled={isSavingWeight} onClick={handleSaveWeight} className="text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">
                    {isSavingWeight ? "Saving..." : "Save Correction"}
                  </button>
                </div>
                <p className="text-[10px] text-amber-600">This correction will be recorded in the Status Update Log.</p>
              </div>
            )}

            <div className="mb-6 border-b border-slate-100 pb-6">
              <HorizontalStageTracker
                sequence={sequence}
                currentIndex={currentIndex}
                mode={shipment.shipmentMode}
                updatedAt={shipment.updatedAt}
              />
            </div>
            <StatusTimeline
              sequence={sequence}
              currentIndex={currentIndex}
              mode={shipment.shipmentMode}
            />
          </SectionCard>
        </>
      )}

      {!shipment && hasSearched && !isSearching && !searchError && (
        <p className="text-sm text-slate-400 text-center py-6">
          No shipment to display.
        </p>
      )}
    </div>
  );
};

export default TrackShipment;
