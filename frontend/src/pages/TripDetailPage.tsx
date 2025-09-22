import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import LogsVisualization from "../components/LogsVisualization";
import RouteMap from "../components/RouteMap";
import { useRefresh } from "../hooks/useRefresh";
import { tripAPI } from "../services/api";

interface Trip {
  id: number;
  driver_name: string;
  pickup_location: string;
  dropoff_location: string;
  start_time: string;
  cycle_used_hours: number;
  created_at: string;
  daily_logs?: DailyLog[];
}

interface DailyLog {
  id: number;
  day: string;
  driving_hours: number;
  off_duty_hours: number;
  status: string;
  remarks: string;
  created_at: string;
}

const TripDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { refreshKey, refresh } = useRefresh();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchTripDetails();
      fetchTripLogs();
    }
  }, [id, refreshKey]);

  const fetchTripDetails = async () => {
    try {
      const response = await tripAPI.getTrip(parseInt(id!));
      setTrip(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.message || "An error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTripLogs = async () => {
    try {
      const response = await tripAPI.getTripLogs(parseInt(id!));
      setLogs(response.data);
    } catch (err: any) {
      console.error("Error fetching logs:", err);
    }
  };

  const calculateRoute = async () => {
    try {
      setCalculatingRoute(true);
      const response = await tripAPI.calculateRoute(parseInt(id!), {
        lat: 40.7128,
        lon: -74.006,
        address: "Current Location",
      });
      setRouteData(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.message || "Route calculation failed"
      );
    } finally {
      setCalculatingRoute(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "driving":
        return "bg-blue-100 text-blue-800";
      case "off_duty":
        return "bg-gray-100 text-gray-800";
      case "sleeper_berth":
        return "bg-purple-100 text-purple-800";
      case "on_duty_not_driving":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error || "Trip not found"}</p>
          <Link
            to="/trips"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Trips
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link
              to="/trips"
              className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
            >
              ← Back to Trips
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              Trip #{trip.id}
            </h1>
            <p className="text-gray-600">Driver: {trip.driver_name}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={refresh}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              🔄 Refresh
            </button>
            <button
              onClick={calculateRoute}
              disabled={calculatingRoute}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {calculatingRoute ? "Calculating..." : "Calculate Route"}
            </button>
            <Link
              to={`/trips/${trip.id}/logs/new`}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Add Log
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trip Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Trip Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Pickup Location
                  </label>
                  <p className="text-gray-900">{trip.pickup_location}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Dropoff Location
                  </label>
                  <p className="text-gray-900">{trip.dropoff_location}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Start Time
                  </label>
                  <p className="text-gray-900">{formatDate(trip.start_time)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Cycle Used Hours
                  </label>
                  <p className="text-gray-900">{trip.cycle_used_hours} hours</p>
                </div>
              </div>
            </div>

            {/* Route Calculation Results */}
            {routeData && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Route Calculation
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {routeData.route.total_distance}
                    </div>
                    <div className="text-sm text-gray-500">
                      Total Distance (miles)
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {routeData.route.total_driving_time}
                    </div>
                    <div className="text-sm text-gray-500">
                      Driving Time (hours)
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {routeData.route.total_trip_time}
                    </div>
                    <div className="text-sm text-gray-500">
                      Total Time (hours)
                    </div>
                  </div>
                </div>

                {routeData.route.stops && routeData.route.stops.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      Required Stops
                    </h3>
                    <div className="space-y-2">
                      {routeData.route.stops.map((stop: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 p-3 rounded"
                        >
                          <span className="text-sm">{stop.description}</span>
                          <span className="text-sm font-medium">
                            {stop.duration}h
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Daily Logs Visualization */}
            <LogsVisualization logs={logs} />

            {/* Route Map */}
            <RouteMap
              routeData={routeData}
              pickupLocation={{
                lat: 41.8781,
                lon: -87.6298,
                address: trip.pickup_location,
              }}
              dropoffLocation={{
                lat: 34.0522,
                lon: -118.2437,
                address: trip.dropoff_location,
              }}
              currentLocation={{
                lat: 40.7128,
                lon: -74.006,
                address: "Current Location",
              }}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Link
                  to={`/trips/${trip.id}/logs/new`}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-center block"
                >
                  Add Daily Log
                </Link>
                <Link
                  to={`/trips/${trip.id}/edit`}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-center block"
                >
                  Edit Trip
                </Link>
              </div>
            </div>

            {/* Trip Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Trip Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">
                    {formatDate(trip.created_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Driver:</span>
                  <span className="font-medium">{trip.driver_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cycle Used:</span>
                  <span className="font-medium">{trip.cycle_used_hours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Logs:</span>
                  <span className="font-medium">{logs.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripDetailPage;
