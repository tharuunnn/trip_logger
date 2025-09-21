import React from "react";

interface DailyLog {
  id: number;
  day: string;
  driving_hours: number;
  off_duty_hours: number;
  status: string;
  remarks: string;
  created_at: string;
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

  // Calculate total hours for each status
  const statusTotals = logs.reduce((acc, log) => {
    const status = log.status;
    if (!acc[status]) {
      acc[status] = { hours: 0, count: 0 };
    }
    acc[status].hours += log.driving_hours + log.off_duty_hours;
    acc[status].count += 1;
    return acc;
  }, {} as Record<string, { hours: number; count: number }>);

  const totalHours = Object.values(statusTotals).reduce(
    (sum, status) => sum + status.hours,
    0
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Daily Logs Visualization
      </h3>

      {logs.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">📊</div>
          <p className="text-gray-600">No logs to visualize</p>
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
                <div className="text-sm font-medium text-gray-900">
                  {getStatusLabel(status)}
                </div>
                <div className="text-xs text-gray-500">
                  {data.hours.toFixed(1)}h ({data.count} logs)
                </div>
              </div>
            ))}
          </div>

          {/* Timeline Visualization */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Timeline</h4>
            <div className="space-y-3">
              {logs.map((log, index) => {
                const drivingPercentage = (log.driving_hours / 24) * 100;
                const offDutyPercentage = (log.off_duty_hours / 24) * 100;

                return (
                  <div key={log.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h5 className="font-medium text-gray-900">
                          {new Date(log.day).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </h5>
                        <span
                          className="inline-block px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: getStatusColor(log.status) + "20",
                            color: getStatusColor(log.status),
                          }}
                        >
                          {getStatusLabel(log.status)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">Log #{log.id}</div>
                    </div>

                    {/* Hours Bar */}
                    <div className="flex h-6 bg-gray-100 rounded-md overflow-hidden">
                      {log.driving_hours > 0 && (
                        <div
                          className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                          style={{ width: `${drivingPercentage}%` }}
                        >
                          {log.driving_hours > 1 && `${log.driving_hours}h`}
                        </div>
                      )}
                      {log.off_duty_hours > 0 && (
                        <div
                          className="bg-gray-500 flex items-center justify-center text-white text-xs font-medium"
                          style={{ width: `${offDutyPercentage}%` }}
                        >
                          {log.off_duty_hours > 1 && `${log.off_duty_hours}h`}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>Driving: {log.driving_hours}h</span>
                      <span>Off-duty: {log.off_duty_hours}h</span>
                    </div>

                    {log.remarks && (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>Remarks:</strong> {log.remarks}
                      </div>
                    )}
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
