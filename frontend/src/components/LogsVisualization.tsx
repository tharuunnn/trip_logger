import React from "react";

interface LogEntry {
  id: number;
  status: string;
  start_hour: number;
  duration_hours: number;
  remarks?: string;
  created_at: string;
}

interface DailyLog {
  id: number;
  day: string;
  driving_hours: number;
  off_duty_hours: number;
  status: string;
  remarks: string;
  created_at: string;
  entries?: LogEntry[];
}

interface LogsVisualizationProps {
  logs: DailyLog[];
}

const LogsVisualization: React.FC<LogsVisualizationProps> = ({ logs }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "driving":
        return "#3B82F6"; // Blue
      case "off_duty":
        return "#6B7280"; // Gray
      case "sleeper_berth":
        return "#8B5CF6"; // Purple
      case "on_duty_not_driving":
        return "#F59E0B"; // Yellow
      default:
        return "#6B7280";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Normalize hours to numbers in case API returns strings (e.g., Decimal fields)
  const normalizedLogs = logs.map((log) => ({
    ...log,
    driving_hours:
      typeof log.driving_hours === "string"
        ? parseFloat(log.driving_hours)
        : log.driving_hours,
    off_duty_hours:
      typeof log.off_duty_hours === "string"
        ? parseFloat(log.off_duty_hours)
        : log.off_duty_hours,
    entries: (log.entries || []).map((e) => ({
      ...e,
      start_hour:
        typeof e.start_hour === "string"
          ? parseFloat(e.start_hour)
          : e.start_hour,
      duration_hours:
        typeof e.duration_hours === "string"
          ? parseFloat(e.duration_hours)
          : e.duration_hours,
    })),
  }));

  // Calculate total hours for each duty status based on entries
  const statusTotals = normalizedLogs.reduce((acc, log) => {
    (log.entries || []).forEach((e) => {
      if (!acc[e.status]) {
        acc[e.status] = { hours: 0, count: 0 };
      }
      acc[e.status].hours += e.duration_hours || 0;
      acc[e.status].count += 1;
    });
    return acc;
  }, {} as Record<string, { hours: number; count: number }>);

  // Calculate total hours (commented out as it's not currently used)
  // const totalHours = Object.values(statusTotals).reduce(
  //   (sum, status) => sum + status.hours,
  //   0
  // );

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Daily Logs Visualization
      </h3>

      {logs.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">📊</div>
          <p className="text-gray-600 dark:text-gray-300">No logs to visualize</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(statusTotals).map(([status, data]) => (
              <div key={status} className="text-center">
                <div
                  className="w-4 h-4 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: getStatusColor(status) }}
                ></div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {getStatusLabel(status)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-300">
                  {data.hours.toFixed(1)}h ({data.count} logs)
                </div>
              </div>
            ))}
          </div>

          {/* ELD-style timeline (SVG with axes and step line) */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Timeline</h4>
            <div className="space-y-3">
              {normalizedLogs.map((log) => {
                const entries = (log.entries || []).map((e) => ({
                  ...e,
                  start_hour:
                    typeof e.start_hour === "string"
                      ? parseFloat(e.start_hour)
                      : e.start_hour,
                  duration_hours:
                    typeof e.duration_hours === "string"
                      ? parseFloat(e.duration_hours)
                      : e.duration_hours,
                }));

                // Lanes and helpers
                const lanes = [
                  { key: "off_duty", label: "Off Duty" },
                  { key: "sleeper_berth", label: "Sleeper" },
                  { key: "driving", label: "Driving" },
                  { key: "on_duty_not_driving", label: "On Duty" },
                ];
                const laneIndex = (status: string) =>
                  lanes.findIndex((l) => l.key === status);

                // Build colored step-line segments from entries
                const sorted = [...entries].sort(
                  (a, b) => a.start_hour - b.start_hour
                );
                const width = 900;
                const height = 180;
                const leftPad = 64;
                const topPad = 12;
                const usableW = width - leftPad - 12;
                const rowH = (height - topPad - 24) / lanes.length;
                const yForStatus = (status: string) =>
                  topPad + rowH * (laneIndex(status) + 0.5);
                const xForHour = (h: number) => leftPad + (h / 24) * usableW;
                const formatHour12 = (h: number) => {
                  const hour = h % 12 || 12;
                  const suffix = h < 12 ? "am" : "pm";
                  return `${hour}${suffix}`;
                };
                const xForQuarter = (q: number) => leftPad + (q / 96) * usableW; // 96 quarters per day

                type HSeg = {
                  x1: number;
                  x2: number;
                  y: number;
                  color: string;
                };
                type VSeg = {
                  x: number;
                  y1: number;
                  y2: number;
                  color: string;
                };
                const hsegs: HSeg[] = [];
                const vsegs: VSeg[] = [];
                if (sorted.length > 0) {
                  let prevEnd: number | null = null;
                  let prevStatus: string | null = null;
                  sorted.forEach((e) => {
                    const start = Math.max(0, Math.min(24, e.start_hour));
                    const end = Math.max(
                      0,
                      Math.min(24, e.start_hour + e.duration_hours)
                    );
                    const y = yForStatus(e.status);
                    const color = getStatusColor(e.status);
                    if (
                      prevEnd !== null &&
                      Math.abs(start - prevEnd) < 1e-6 &&
                      prevStatus &&
                      prevStatus !== e.status
                    ) {
                      // vertical transition at exact boundary
                      vsegs.push({
                        x: xForHour(start),
                        y1: yForStatus(prevStatus),
                        y2: y,
                        color,
                      });
                    }
                    hsegs.push({
                      x1: xForHour(start),
                      x2: xForHour(end),
                      y,
                      color,
                    });
                    prevEnd = end;
                    prevStatus = e.status;
                  });
                }

                return (
                  <div key={log.id} className="border border-[color:var(--border)] rounded-lg p-4" style={{ background: 'var(--surface)' }}>
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-gray-100">
                          {new Date(log.day).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </h5>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-300">Log #{log.id}</div>
                    </div>
                    <svg
                      width="100%"
                      viewBox={`0 0 ${width} ${height}`}
                      className="rounded-md border"
                      style={{ background: 'var(--surface-muted)', borderColor: 'var(--border)' }}
                    >
                      {/* Y labels */}
                      {lanes.map((lane, i) => (
                        <text
                          key={lane.key}
                          x={8}
                          y={topPad + rowH * (i + 0.6)}
                          fontSize="12"
                          fill="var(--text-muted)"
                        >
                          {lane.label}
                        </text>
                      ))}
                      {/* 15-min subgrid */}
                      {Array.from({ length: 97 }).map((_, i) => (
                        <line
                          key={`q${i}`}
                          x1={xForQuarter(i)}
                          y1={topPad}
                          x2={xForQuarter(i)}
                          y2={height - 12}
                          stroke="var(--grid-subtle)"
                          strokeWidth={1}
                        />
                      ))}
                      {/* Hour grid + 12-hour labels */}
                      {Array.from({ length: 25 }).map((_, i) => (
                        <g key={i}>
                          <line
                            x1={xForHour(i)}
                            y1={topPad}
                            x2={xForHour(i)}
                            y2={height - 12}
                            stroke="var(--grid-strong)"
                            strokeWidth={i % 6 === 0 ? 2 : 1}
                          />
                          <text
                            x={xForHour(i)}
                            y={height - 2}
                            fontSize="10"
                            textAnchor="middle"
                            fill="var(--text-muted)"
                          >
                            {formatHour12(i)}
                          </text>
                        </g>
                      ))}
                      {/* Horizontal lane lines */}
                      {lanes.map((lane, i) => (
                        <line
                          key={lane.key}
                          x1={leftPad}
                          y1={topPad + rowH * (i + 1)}
                          x2={width - 12}
                          y2={topPad + rowH * (i + 1)}
                          stroke="var(--grid-strong)"
                          strokeWidth={1}
                        />
                      ))}
                      {/* Colored horizontal segments per entry */}
                      {hsegs.map((s, i) => (
                        <line
                          key={`h-${i}`}
                          x1={s.x1}
                          y1={s.y}
                          x2={s.x2}
                          y2={s.y}
                          stroke={s.color}
                          strokeWidth={3}
                          strokeLinecap="round"
                        />
                      ))}
                      {/* Vertical connectors at boundaries */}
                      {vsegs.map((v, i) => (
                        <line
                          key={`v-${i}`}
                          x1={v.x}
                          y1={v.y1}
                          x2={v.x}
                          y2={v.y2}
                          stroke={v.color}
                          strokeWidth={3}
                        />
                      ))}
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compliance Check */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">
              📋 ELD Compliance Check
            </h4>
            <div className="text-sm text-yellow-800 space-y-1">
              {logs.some((log) => log.driving_hours > 11) && (
                <div className="text-red-600">
                  ⚠️ Some logs exceed 11-hour driving limit
                </div>
              )}
              {logs.some(
                (log) => log.off_duty_hours < 10 && log.driving_hours > 0
              ) && (
                <div className="text-red-600">
                  ⚠️ Some logs have insufficient off-duty time
                </div>
              )}
              {logs.every(
                (log) => log.driving_hours <= 11 && log.off_duty_hours >= 10
              ) && (
                <div className="text-green-600">
                  ✅ All logs are ELD compliant
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsVisualization;
