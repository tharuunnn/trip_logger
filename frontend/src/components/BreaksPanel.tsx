import React, { useEffect, useMemo, useState } from "react";

interface StopItem {
  type: string;
  description: string;
  duration: number; // hours
  mandatory?: boolean;
}

interface BreaksPanelProps {
  tripId: number;
  stops?: StopItem[];
}

// Formats seconds to H:MM:SS
const formatHMS = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
};

const BreaksPanel: React.FC<BreaksPanelProps> = ({ tripId, stops }) => {
  const storageKey = `breaks_${tripId}`;
  const [isDriving, setIsDriving] = useState<boolean>(false);
  const [drivingStart, setDrivingStart] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  // Load persisted state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        setIsDriving(!!data.isDriving);
        setDrivingStart(data.drivingStart ?? null);
        setCompleted(data.completed ?? {});
      }
    } catch {}
  }, [storageKey]);

  // Persist state
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ isDriving, drivingStart, completed })
      );
    } catch {}
  }, [isDriving, drivingStart, completed, storageKey]);

  // Tick timer every second when driving
  useEffect(() => {
    if (!isDriving) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isDriving]);

  const secondsSinceStart = useMemo(() => {
    if (!isDriving || !drivingStart) return 0;
    return Math.floor((now - drivingStart) / 1000);
  }, [isDriving, drivingStart, now]);

  // 8-hour break logic (28800 seconds)
  const EIGHT_HOURS = 8 * 3600;
  const remainingToBreak = Math.max(0, EIGHT_HOURS - secondsSinceStart);
  const breakRequired = isDriving && remainingToBreak <= 0 && !completed["8hr_break"];

  const toggleDriving = () => {
    if (isDriving) {
      setIsDriving(false);
      setDrivingStart(null);
    } else {
      setIsDriving(true);
      setDrivingStart(Date.now());
    }
  };

  const toggleCompleted = (key: string) => {
    setCompleted((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const effectiveStops: StopItem[] = useMemo(() => {
    const base = stops || [];
    // Ensure required 30-min break entries at 8h and 16h are present in UI listing
    const extra: StopItem[] = [
      { type: "rest_break", description: "30-minute rest break (after 8 hours)", duration: 0.5, mandatory: true },
      { type: "rest_break", description: "30-minute rest break (after 16 hours)", duration: 0.5, mandatory: true },
    ];
    // Merge by description uniqueness
    const map = new Map<string, StopItem>();
    [...base, ...extra].forEach((s) => {
      const key = s.description;
      if (!map.has(key)) map.set(key, s);
    });
    return Array.from(map.values());
  }, [stops]);

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

      <div className="space-y-2">
        {effectiveStops.map((s, idx) => {
          const key = s.description;
          const checked = !!completed[key];
          return (
            <label key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2 h-4 w-4"
                  checked={checked}
                  onChange={() => toggleCompleted(key)}
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">{key}</span>
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{s.duration}h</span>
            </label>
          );
        })}
      </div>

      {breakRequired && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
          You have reached 8 hours of driving. Please take the required 30-minute break and mark it as completed.
        </div>
      )}
    </div>
  );
};

export default BreaksPanel;
