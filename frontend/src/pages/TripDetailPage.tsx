import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import LogsVisualization from "../components/LogsVisualization";
import RouteMap from "../components/RouteMapRL";
import BreaksPanel from "../components/BreaksPanel";
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
  const { refreshKey } = useRefresh();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [cycleInfo, setCycleInfo] = useState<
    | {
        used_hours: number;
        remaining_hours: number;
        window_start: string;
        window_end: string;
        restart_detected: boolean;
        restart_end_day?: string | null;
      }
    | null
  >(null);
  // Minimal route data typing to avoid 'any' while allowing flexible shape
  const [routeData, setRouteData] = useState<
    | {
        route?: {
          total_distance?: number | string;
          total_driving_time?: number | string;
          total_trip_time?: number | string;
          stops?: { description: string; duration: number }[];
          segments?: { coordinates?: [number, number][] }[];
          combined_coordinates?: [number, number][];
        };
      }
    | null
  >(null);
  const [currentLocation, setCurrentLocation] = useState<
    { lat: number; lon: number; address: string } | undefined
  >(undefined);
  const [pickupLocation, setPickupLocation] = useState<
    { lat: number; lon: number; address: string } | undefined
  >(undefined);
  const [dropoffLocation, setDropoffLocation] = useState<
    { lat: number; lon: number; address: string } | undefined
  >(undefined);

  // Load persisted route + markers (per-trip) on mount/id change
  useEffect(() => {
    if (!id) return;
    try {
      const savedRoute = localStorage.getItem(`routeData_${id}`);
      const savedMarkers = localStorage.getItem(`routeMarkers_${id}`);
      if (savedRoute) {
        setRouteData(JSON.parse(savedRoute));
      }
      if (savedMarkers) {
        const m = JSON.parse(savedMarkers);
        setCurrentLocation(m.currentLocation || undefined);
        setPickupLocation(m.pickupLocation || undefined);
        setDropoffLocation(m.dropoffLocation || undefined);
      }
    } catch {
      console.debug("Failed to parse saved route/markers from localStorage");
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchTripDetails();
      fetchTripLogs();
      fetchCycleRemaining();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshKey]);

  const fetchTripDetails = async () => {
    try {
      const response = await tripAPI.getTrip(parseInt(id!));
      setTrip(response.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // Coerce numeric fields that come from API as strings (Decimal) into numbers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalized = (response.data || []).map((log: any) => ({
        ...log,
        driving_hours:
          typeof log.driving_hours === "string"
            ? parseFloat(log.driving_hours)
            : log.driving_hours,
        off_duty_hours:
          typeof log.off_duty_hours === "string"
            ? parseFloat(log.off_duty_hours)
            : log.off_duty_hours,
      }));
      setLogs(normalized);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Error fetching logs:", err);
    }
  };

  const fetchCycleRemaining = async () => {
    try {
      const response = await tripAPI.cycleRemaining(parseInt(id!));
      setCycleInfo(response.data);
    } catch (err) {
      console.warn("Failed to fetch cycle remaining", err);
    }
  };

  const calculateRoute = async () => {
    try {
      setCalculatingRoute(true);

      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
      }

      // Get real-time location
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // Send to backend directly
          const response = await tripAPI.calculateRoute(parseInt(id!), {
            lat: latitude,
            lon: longitude,
            address: "Current Location",
          });

          const data = response.data;
          console.log("Route calc response:", data);
          console.log(
            "Segments lengths:",
            data?.route?.segments?.map(
              (s: { coordinates?: [number, number][] }) =>
                s?.coordinates?.length || 0
            )
          );
          console.log(
            "Combined coords length:",
            data?.route?.combined_coordinates?.length || 0
          );
          setRouteData(data);
          try {
            localStorage.setItem(`routeData_${id}`, JSON.stringify(data));
          } catch {
            console.debug("Failed to persist routeData to localStorage");
          }

          // Set marker states from response + geolocation
          setCurrentLocation({
            lat: latitude,
            lon: longitude,
            address: "Current Location",
          });

          const seg0 = data?.route?.segments?.[0];
          const seg1 = data?.route?.segments?.[1];
          const seg0Coords: [number, number][] | undefined = seg0?.coordinates;
          const seg1Coords: [number, number][] | undefined = seg1?.coordinates;

          const pickupCoord =
            seg0Coords && seg0Coords.length > 0
              ? seg0Coords[seg0Coords.length - 1]
              : undefined;
          const dropoffCoord =
            seg1Coords && seg1Coords.length > 0
              ? seg1Coords[seg1Coords.length - 1]
              : undefined;

          if (pickupCoord) {
            setPickupLocation({
              lat: pickupCoord[0],
              lon: pickupCoord[1],
              address: trip?.pickup_location || "Pickup",
            });
          }
          if (dropoffCoord) {
            setDropoffLocation({
              lat: dropoffCoord[0],
              lon: dropoffCoord[1],
              address: trip?.dropoff_location || "Dropoff",
            });
          }

          // Persist markers
          try {
            localStorage.setItem(
              `routeMarkers_${id}`,
              JSON.stringify({
                currentLocation: {
                  lat: latitude,
                  lon: longitude,
                  address: "Current Location",
                },
                pickupLocation: pickupCoord
                  ? {
                      lat: pickupCoord[0],
                      lon: pickupCoord[1],
                      address: trip?.pickup_location || "Pickup",
                    }
                  : undefined,
                dropoffLocation: dropoffCoord
                  ? {
                      lat: dropoffCoord[0],
                      lon: dropoffCoord[1],
                      address: trip?.dropoff_location || "Dropoff",
                    }
                  : undefined,
              })
            );
          } catch {
            console.debug("Failed to persist routeMarkers to localStorage");
          }
          // Ensure loader turns off after successful processing
          setCalculatingRoute(false);
        },
        () => {
          alert("Please allow location access to calculate route");
          setCalculatingRoute(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.message || "Route calculation failed"
      );
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

  // getStatusColor was unused in this component; removed to avoid linter warning

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Trip #{trip.id}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">Driver: {trip.driver_name}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={calculateRoute}
              disabled={calculatingRoute}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-md shadow hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-60"
            >
              {calculatingRoute ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                  Calculating...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A2 2 0 013 15.382V8.618a2 2 0 011.553-1.894L9 4m6 16l5.447-2.724A2 2 0 0021 15.382V8.618a2 2 0 00-1.553-1.894L15 4M9 4l6 16M9 4l6 16"/></svg>
                  Calculate Route
                </>
              )}
            </button>
            <Link
              to={`/trips/${trip.id}/logs/new`}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md shadow hover:bg-emerald-700 transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              Add to Log
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trip Details */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Trip Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Pickup Location
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{trip.pickup_location}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Dropoff Location
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{trip.dropoff_location}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Start Time
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{formatDate(trip.start_time)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Cycle Used Hours
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{trip.cycle_used_hours} hours</p>
                </div>
              </div>
            </div>

            {/* Route Calculation Results */}
            {routeData && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Route Calculation
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {routeData?.route?.total_distance ?? "--"}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-300">
                      Total Distance (miles)
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {routeData?.route?.total_driving_time ?? "--"}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-300">
                      Driving Time (hours)
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {routeData?.route?.total_trip_time ?? "--"}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-300">
                      Total Time (hours)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Daily Logs Visualization */}
            <LogsVisualization logs={logs} />

            {/* Route Map */}
            <div className="relative">
              {calculatingRoute && (
                <div className="absolute inset-0 z-10 bg-white/70 flex items-center justify-center">
                  <div className="flex items-center space-x-2 text-gray-700">
                    <svg
                      className="animate-spin h-5 w-5 text-purple-600"
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
                    <span>Calculating route…</span>
                  </div>
                </div>
              )}
              <RouteMap
                // RouteMap accepts flexible routeData; pass as-is
                routeData={routeData as unknown as any}
                pickupLocation={pickupLocation}
                dropoffLocation={dropoffLocation}
                currentLocation={currentLocation}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trip Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Trip Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Created:</span>
                  <span className="font-medium dark:text-gray-100">
                    {formatDate(trip.created_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Driver:</span>
                  <span className="font-medium dark:text-gray-100">{trip.driver_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Cycle Used:</span>
                  <span className="font-medium dark:text-gray-100">{trip.cycle_used_hours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Logs:</span>
                  <span className="font-medium dark:text-gray-100">{logs.length}</span>
                </div>
                {cycleInfo && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Cycle Remaining (70/8):</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{cycleInfo.remaining_hours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Cycle Used:</span>
                      <span className="font-medium dark:text-gray-100">{cycleInfo.used_hours.toFixed(1)}h</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Window: {new Date(cycleInfo.window_start).toLocaleDateString()} → {new Date(cycleInfo.window_end).toLocaleDateString()}
                    </div>
                    {cycleInfo.restart_detected && (
                      <div className="text-xs text-blue-600 dark:text-blue-300">34-hour restart detected (ended {cycleInfo.restart_end_day})</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Breaks and enforcement */}
            <BreaksPanel tripId={trip.id} stops={routeData?.route?.stops as any} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripDetailPage;
