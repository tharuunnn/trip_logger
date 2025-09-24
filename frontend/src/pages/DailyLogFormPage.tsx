import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { entryAPI, logAPI, tripAPI } from "../services/api";
import type { ValidationError } from "../utils/validation";
import { hasFieldError } from "../utils/validation";

interface Trip {
  id: number;
  driver_name: string;
  pickup_location: string;
  dropoff_location: string;
}

const DailyLogFormPage = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [formData, setFormData] = useState({
    day: "",
    status: "off_duty",
    start_time: "", // HH:MM
    duration_hours: "",
    remarks: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );

  useEffect(() => {
    if (tripId) {
      fetchTrip();
    }
  }, [tripId]);

  const fetchTrip = async () => {
    try {
      const response = await tripAPI.getTrip(parseInt(tripId!));
      setTrip(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.message || "An error occurred"
      );
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear validation error for this field when user starts typing
    if (hasFieldError(validationErrors, name)) {
      setValidationErrors((prev) =>
        prev.filter((error) => error.field !== name)
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setValidationErrors([]);

    // Basic validation for entry
    const errors: ValidationError[] = [];
    if (!formData.day)
      errors.push({ field: "day", message: "Date is required" });
    if (!formData.status)
      errors.push({ field: "status", message: "Status is required" });
    if (!formData.start_time)
      errors.push({ field: "start_time", message: "Start time is required" });
    if (formData.duration_hours === "")
      errors.push({ field: "duration_hours", message: "Duration is required" });
    if (errors.length) {
      setValidationErrors(errors);
      setLoading(false);
      return;
    }

    try {
      // Find or create DailyLog for the selected day
      const tripNumericId = parseInt(tripId!);
      const logsResp = await tripAPI.getTripLogs(tripNumericId);
      const existing = (logsResp.data || []).find(
        (l: any) => l.day === formData.day
      );
      let dailyLogId: number;
      if (existing) {
        dailyLogId = existing.id;
      } else {
        const createResp = await logAPI.createLog({
          trip: tripNumericId,
          day: formData.day,
          status: formData.status,
          driving_hours: 0,
          off_duty_hours: 0,
          remarks: "",
        });
        dailyLogId = createResp.data.id;
      }

      // Convert HH:MM to decimal hours
      const [hh, mm] = formData.start_time.split(":");
      const startHour =
        (parseInt(hh || "0") || 0) + (parseInt(mm || "0") || 0) / 60;
      const durationNum = parseFloat(String(formData.duration_hours));

      const response = await entryAPI.createEntry({
        daily_log: dailyLogId,
        status: formData.status,
        start_hour: startHour,
        duration_hours: durationNum,
        remarks: formData.remarks,
      });
      console.log("Create entry response:", response.status, response.data);
      navigate(`/trips/${tripId}`);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.message || "An error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: "off_duty", label: "Off Duty" },
    { value: "sleeper_berth", label: "Sleeper Berth" },
    { value: "driving", label: "Driving" },
    { value: "on_duty_not_driving", label: "On Duty Not Driving" },
  ];

  if (error && !trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/trips")}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Trips
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add to Log</h1>
          <p className="mt-2 text-gray-600">
            {trip &&
              `For Trip #${trip.id}: ${trip.pickup_location} → ${trip.dropoff_location}`}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date */}
            <div>
              <label
                htmlFor="day"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Date *
              </label>
              <input
                type="date"
                id="day"
                name="day"
                value={formData.day}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Status *
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Time */}
            <div>
              <label
                htmlFor="start_time"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Start Time *
              </label>
              <input
                type="time"
                id="start_time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Duration (hours) */}
            <div>
              <label
                htmlFor="duration_hours"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Duration (hours) *
              </label>
              <input
                type="number"
                id="duration_hours"
                name="duration_hours"
                value={formData.duration_hours}
                onChange={handleChange}
                required
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.0"
              />
            </div>

            {/* Remarks */}
            <div>
              <label
                htmlFor="remarks"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Remarks
              </label>
              <textarea
                id="remarks"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any additional notes or remarks..."
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate(`/trips/${tripId}`)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-flex items-center">
                    <svg
                      className="animate-spin h-4 w-4 mr-2 text-white"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path>
                    </svg>
                    Creating...
                  </span>
                ) : (
                  "Add Entry"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ELD Compliance Info */}
        <div className="mt-8 bg-yellow-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-yellow-900 mb-2">
            📋 ELD Compliance Information
          </h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Maximum 11 hours of driving per day</li>
            <li>• Minimum 10 hours off duty required</li>
            <li>• 30-minute rest break required after 8 hours of driving</li>
            <li>• All hours must be accurately recorded for compliance</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DailyLogFormPage;
