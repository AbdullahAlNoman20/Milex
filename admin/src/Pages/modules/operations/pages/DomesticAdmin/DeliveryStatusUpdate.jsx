// src/Pages/modules/operations/pages/DomesticAdmin/DeliveryStatusUpdate.jsx
// (Same structural layout reused verbatim in ForeignAdmin/DeliveryStatusUpdate.jsx)
import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SectionCard from '../../components/SectionCard';
import StatusTimeline from '../../components/StatusTimeline';
import WaitingForBadge from '../../components/WaitingForBadge';
import {
  SHIPMENT_MODE, getSequenceForMode, getExceptionsForMode, getStatusIndex,
  getAllowedNextSteps, getNextStepOwnerRole, getOwnedStageLabels,
} from '../../constants/shipmentStatus';
import { OPERATIONS_ROLE_LABELS } from '../../constants/operationsRoles';
import { fetchShipmentByAwb, updateShipmentStatus } from '../../services/shipmentService';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { isRequired } from '../../../../../Components/utils/validators';

const DeliveryStatusUpdate = () => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState(SHIPMENT_MODE.EXPORT);
  const [awbNumber, setAwbNumber] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exception, setException] = useState('');
  const [note, setNote] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLooking, setIsLooking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [allowedSteps, setAllowedSteps] = useState([]);

  const sequence = getSequenceForMode(mode);
  const exceptions = getExceptionsForMode(mode);
  const canAct = isLoaded && allowedSteps.length > 0;
  const waitingOnRole = isLoaded ? getNextStepOwnerRole(mode, sequence[currentIndex]?.code) : null;
  const waitingOnLabel = waitingOnRole ? OPERATIONS_ROLE_LABELS[waitingOnRole] : null;
  const selectableIndices = Array.from(new Set([currentIndex, ...allowedSteps])).sort((a, b) => a - b);

  const handleLoad = useCallback(async (overrideAwb) => {
    const awbToUse = overrideAwb || awbNumber;
    if (!isRequired(awbToUse)) {
      showToast('Enter an AWB / CN number', 'warning');
      return;
    }
    setIsLooking(true);
    try {
      const shipment = await fetchShipmentByAwb(awbToUse.trim());
      if (!shipment) {
        showToast('No shipment found for this AWB / CN number', 'error');
        setIsLoaded(false);
        return;
      }
      const idx = getStatusIndex(shipment.shipmentMode, shipment.statusCode);
      setMode(shipment.shipmentMode);
      setCurrentIndex(idx);
      setException(shipment.exceptionCode || '');
      setAllowedSteps(getAllowedNextSteps(currentUser?.role, shipment.shipmentMode, idx));
      setIsLoaded(true);
    } catch {
      showToast('Failed to look up shipment', 'error');
    } finally {
      setIsLooking(false);
    }
  }, [awbNumber, currentUser, showToast]);

  useEffect(() => {
    const paramAwb = searchParams.get('awb');
    if (paramAwb) {
      setAwbNumber(paramAwb);
      handleLoad(paramAwb);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = useCallback(async () => {
    if (!isLoaded) {
      showToast('Load a shipment before saving an update', 'warning');
      return;
    }
    if (!allowedSteps.includes(currentIndex)) {
      showToast('You are not permitted to set this status — it belongs to another role\'s stage', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const step = sequence[currentIndex];
      await updateShipmentStatus(
        awbNumber,
        { statusCode: step.code, exceptionCode: exception || null, note },
        currentUser?.name
      );
      showToast(`Status updated to "${step.label}"`);
      setNote('');
    } catch (err) {
      showToast(err?.message || 'Failed to save update', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [isLoaded, allowedSteps, sequence, currentIndex, awbNumber, exception, note, currentUser, showToast]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Delivery Status Update</h1>
        <p className="text-sm text-slate-500">Look up a shipment, then update its status.</p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Your Permitted Actions</p>
        <p className="text-xs text-slate-600">
          <span className="font-bold text-slate-700">For EXPORT shipments</span>, you can update:{' '}
          {getOwnedStageLabels(currentUser?.role, 'EXPORT').join(' → ') || 'No stages assigned to your role.'}
        </p>
        <p className="text-xs text-slate-600">
          <span className="font-bold text-slate-700">For IMPORT shipments</span>, you can update:{' '}
          {getOwnedStageLabels(currentUser?.role, 'IMPORT').join(' → ') || 'No stages assigned to your role.'}
        </p>
      </div>

      <SectionCard title="Find Shipment">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">AWB / CN Number</label>
            <input
              value={awbNumber}
              onChange={(e) => {
                setAwbNumber(e.target.value);
                setIsLoaded(false);
              }}
              maxLength={30}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Shipment Mode</label>
            <select
              value={mode}
              disabled={isLoaded}
              onChange={(e) => {
                setMode(e.target.value);
                setCurrentIndex(0);
                setException('');
              }}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60"
            >
              <option value={SHIPMENT_MODE.EXPORT}>Export</option>
              <option value={SHIPMENT_MODE.IMPORT}>Import</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleLoad}
            disabled={isLooking}
            className="bg-slate-800 text-white font-bold py-2.5 rounded-lg hover:bg-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLooking ? 'Loading...' : 'Load Shipment'}
          </button>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Update Status" subtitle="Move shipment to the next step in sequence">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Set Current Status</label>
              <select
                value={currentIndex}
                disabled={!canAct}
                onChange={(e) => setCurrentIndex(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60"
              >
                {selectableIndices.map((idx) => (
                  <option key={sequence[idx].code} value={idx}>{sequence[idx].label}</option>
                ))}
              </select>
              {isLoaded && !canAct && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700 font-semibold">
                  This shipment is currently with {waitingOnLabel || 'another role'} — you can view its progress but cannot update the status from here.
                </div>
              )}
              {sequence[currentIndex]?.description && (
                <p className="text-xs text-slate-500 mt-1.5 bg-slate-50 border border-slate-100 rounded-lg p-2">
                  {sequence[currentIndex].description}
                </p>
              )}
              {isLoaded && (
                <div className="mt-2">
                  <WaitingForBadge mode={mode} statusCode={sequence[currentIndex]?.code} exceptionCode={exception || null} />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Note / Remarks</label>
              <textarea
                rows={3}
                value={note}
                disabled={!canAct}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60"
              />
            </div>
            <div className="border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-red-500 mb-1">Flag Exception / Hold (optional)</label>
              <select
                value={exception}
                disabled={!canAct}
                onChange={(e) => setException(e.target.value)}
                className="w-full border border-red-200 rounded-lg p-2.5 text-sm bg-red-50 focus:border-red-500 outline-none disabled:opacity-60"
              >
                <option value="">None</option>
                {exceptions.map((e) => <option key={e.code} value={e.code}>{e.label}</option>)}
              </select>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canAct || isSaving}
              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Update'}
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Tracking Sequence Preview">
          <StatusTimeline sequence={sequence} currentIndex={currentIndex} mode={mode} />
        </SectionCard>
      </div>
    </div>
  );
};

export default DeliveryStatusUpdate;