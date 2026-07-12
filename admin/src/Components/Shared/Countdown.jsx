// src/Components/Shared/Countdown.jsx
import React, { useState, useEffect, useMemo } from 'react';

const clampToZero = (ms) => (ms > 0 ? ms : 0);

const formatDuration = (ms) => {
  if (ms <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { expired: false, days, hours, minutes, seconds };
};

const Countdown = ({ expiryDate, onExpire, className = '' }) => {
  const targetMs = useMemo(() => {
    const t = new Date(expiryDate).getTime();
    return Number.isFinite(t) ? t : null;
  }, [expiryDate]);

  const [remaining, setRemaining] = useState(() =>
    targetMs ? clampToZero(targetMs - Date.now()) : 0
  );
  const [hasFiredExpire, setHasFiredExpire] = useState(false);

  useEffect(() => {
    if (!targetMs) return undefined;
    setRemaining(clampToZero(targetMs - Date.now()));
    setHasFiredExpire(false);

    const interval = setInterval(() => {
      setRemaining(clampToZero(targetMs - Date.now()));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetMs]);

  useEffect(() => {
    if (remaining <= 0 && !hasFiredExpire && targetMs) {
      setHasFiredExpire(true);
      onExpire?.();
    }
  }, [remaining, hasFiredExpire, targetMs, onExpire]);

  if (!targetMs) {
    return <span className={`text-slate-400 text-xs ${className}`}>No expiry set</span>;
  }

  const { expired, days, hours, minutes, seconds } = formatDuration(remaining);

  if (expired) {
    return (
      <span className={`text-red-600 font-bold text-xs uppercase tracking-wide ${className}`}>
        Expired
      </span>
    );
  }

  return (
    <span className={`font-mono text-sm font-bold tabular-nums ${className}`}>
      {String(days).padStart(2, '0')}:{String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
};

export default Countdown;