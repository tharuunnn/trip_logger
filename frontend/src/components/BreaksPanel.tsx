import React, { useEffect, useState } from "react";

interface BreaksPanelProps {
  tripId: number;
  // stops?: StopItem[]; // no longer used in minimal flow
}

// Formats seconds to H:MM:SS
const formatHMS = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
};

const BreaksPanel: React.FC<BreaksPanelProps> = ({ tripId }) => {
  const storageKey = `breaks_v2_${tripId}`;
  const [isDriving, setIsDriving] = useState<boolean>(false);
  const [drivingSinceBreakSec, setDrivingSinceBreakSec] = useState<number>(0);
  const [totalDrivingTodaySec, setTotalDrivingTodaySec] = useState<number>(0);
  const [lastTick, setLastTick] = useState<number>(Date.now());
  const [breakActive, setBreakActive] = useState<boolean>(false);
  const [breakStart, setBreakStart] = useState<number | null>(null);
  const [breakElapsedSec, setBreakElapsedSec] = useState<number>(0);

  // Load persisted state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        setIsDriving(!!data.isDriving);
        setDrivingSinceBreakSec(data.drivingSinceBreakSec ?? 0);
        setTotalDrivingTodaySec(data.totalDrivingTodaySec ?? 0);
        setBreakActive(!!data.breakActive);
        setBreakStart(data.breakStart ?? null);
        setBreakElapsedSec(data.breakElapsedSec ?? 0);
        setLastTick(Date.now());
      }
    } catch {}
  }, [storageKey]);

  // Persist state
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          isDriving,
          drivingSinceBreakSec,
          totalDrivingTodaySec,
          breakActive,
          breakStart,
          breakElapsedSec,
        })
      );
    } catch {}
  }, [isDriving, drivingSinceBreakSec, totalDrivingTodaySec, breakActive, breakStart, breakElapsedSec, storageKey]);

  // Tick timers every second
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      const dt = Math.max(0, Math.floor((now - lastTick) / 1000));
      setLastTick(now);

      // Drive accumulation
      if (isDriving && !breakActive && dt > 0) {
        setDrivingSinceBreakSec((v) => v + dt);
        setTotalDrivingTodaySec((v) => v + dt);
      }
      // Break accumulation
      if (breakActive && breakStart) {
        setBreakElapsedSec(Math.max(0, Math.floor((now - breakStart) / 1000)));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [isDriving, breakActive, breakStart, lastTick]);

  // 8-hour break logic (28800 seconds)
  const EIGHT_HOURS = 8 * 3600;
  const remainingToBreak = Math.max(0, EIGHT_HOURS - drivingSinceBreakSec);
  const breakRequired = isDriving && remainingToBreak <= 0;

  const toggleDriving = () => {
    if (breakActive) return; // cannot drive during break
    setIsDriving((d) => !d);
    setLastTick(Date.now());
  };

  const startBreak = () => {
    setBreakActive(true);
    setBreakStart(Date.now());
    setBreakElapsedSec(0);
    setIsDriving(false);
  };

  const endBreak = () => {
    // Qualifying break: 30 consecutive minutes
    if (breakElapsedSec >= 30 * 60) {
      setDrivingSinceBreakSec(0); // reset 8-hour driving counter
    }
    setBreakActive(false);
    setBreakStart(null);
    setBreakElapsedSec(0);
    setLastTick(Date.now());
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Breaks & Requirements</h3>
        <button
          onClick={toggleDriving}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
            isDriving
              ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
              : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
          }`}
          >
          {isDriving ? "Stop Driving" : "Start Driving"}
        </button>
      </div>

      <div className="mb-4">
        <div className="text-sm text-gray-600 dark:text-gray-300">Time to next 8h break</div>
        <div className={`text-xl font-bold ${breakRequired ? "text-red-600" : "text-gray-900 dark:text-gray-100"}`}>
          {breakRequired ? "Break Required" : formatHMS(remainingToBreak)}
        </div>
      </div>

      <div className="space-y-3">
        {!breakActive ? (
          <button
            onClick={startBreak}
            className="w-full px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
            disabled={!isDriving && remainingToBreak > 0}
            title={!isDriving && remainingToBreak > 0 ? "You can still take a break, but timer only matters for driving" : undefined}
          >
            Take 30-minute Break
          </button>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-200">Break time</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">{formatHMS(breakElapsedSec)}</div>
            </div>
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
              {breakElapsedSec >= 1800 ? "Qualifying break reached (30m)" : `${Math.ceil((1800 - breakElapsedSec)/60)} min left to qualify`}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={endBreak}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition"
              >
                End Break
              </button>
            </div>
          </div>
        )}
      </div>

      {breakRequired && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
          You have reached 8 hours of driving. Please take a 30-minute consecutive break before continuing to drive.
        </div>
      )}
    </div>
  );
};

export default BreaksPanel;
