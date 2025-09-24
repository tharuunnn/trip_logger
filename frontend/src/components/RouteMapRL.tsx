/* eslint-disable @typescript-eslint/no-explicit-any */
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import React, { useMemo } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

type LatLng = [number, number];

interface RouteMapProps {
  routeData?: {
    route: {
      total_distance: number;
      total_driving_time: number;
      total_trip_time: number;
      combined_coordinates?: LatLng[];
      segments: Array<{
        from: string;
        to: string;
        distance: number;
        driving_time: number;
        coordinates?: LatLng[];
      }>;
      stops?: Array<{ type: string; description: string; duration: number }>;
    };
    daily_logs: any[];
    compliance: any;
  };
  pickupLocation?: { lat: number; lon: number; address: string };
  dropoffLocation?: { lat: number; lon: number; address: string };
  currentLocation?: { lat: number; lon: number; address: string };
}

const FitBounds: React.FC<{ coords: LatLng[] }> = ({ coords }) => {
  const map = useMap();
  React.useEffect(() => {
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords as any);
      map.fitBounds(bounds.pad(0.1));
      setTimeout(() => map.invalidateSize(true), 0);
    }
  }, [coords, map]);
  return null;
};

const RouteMap: React.FC<RouteMapProps> = ({
  routeData,
  pickupLocation,
  dropoffLocation,
  currentLocation,
}) => {
  const allCoords: LatLng[] = useMemo(() => {
    const segs =
      routeData?.route?.segments?.flatMap((s) => s.coordinates || []) || [];
    const comb = routeData?.route?.combined_coordinates || [];
    const c = segs.length > 0 ? segs : comb;
    return (c || []).filter(
      (p) =>
        Array.isArray(p) && p.length === 2 && isFinite(p[0]) && isFinite(p[1])
    ) as LatLng[];
  }, [routeData]);

  if (!routeData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Map</h3>
        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-4xl mb-2">🗺️</div>
            <p className="text-gray-600">Calculate route to see map</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Map</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="text-center bg-blue-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">
            {routeData.route.total_distance.toFixed(2)}
          </div>
          <div className="text-sm text-blue-800">Total Distance (miles)</div>
        </div>
        <div className="text-center bg-green-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-600">
            {routeData.route.total_driving_time.toFixed(2)}
          </div>
          <div className="text-sm text-green-800">Driving Time (hours)</div>
        </div>
        <div className="text-center bg-purple-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-purple-600">
            {routeData.route.total_trip_time.toFixed(2)}
          </div>
          <div className="text-sm text-purple-800">Total Time (hours)</div>
        </div>
      </div>

      <div className="h-64 rounded-lg overflow-hidden border relative">
        <MapContainer
          style={{ height: 256, width: "100%" }}
          center={allCoords[0] || [20.5937, 78.9629]}
          zoom={5}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution="© OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {allCoords.length > 0 && (
            <>
              <Polyline
                positions={allCoords}
                pathOptions={{ color: "blue", weight: 4 }}
              />
              <FitBounds coords={allCoords} />
            </>
          )}
          {currentLocation && (
            <Marker position={[currentLocation.lat, currentLocation.lon]}>
              <Popup>
                <strong>Current</strong>
                <div>{currentLocation.address}</div>
              </Popup>
            </Marker>
          )}
          {pickupLocation && (
            <Marker position={[pickupLocation.lat, pickupLocation.lon]}>
              <Popup>
                <strong>Pickup</strong>
                <div>{pickupLocation.address}</div>
              </Popup>
            </Marker>
          )}
          {dropoffLocation && (
            <Marker position={[dropoffLocation.lat, dropoffLocation.lon]}>
              <Popup>
                <strong>Dropoff</strong>
                <div>{dropoffLocation.address}</div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
        {routeData && (
          <div className="absolute top-1 left-1 bg-white/80 text-xs px-2 py-1 rounded shadow">
            coords: {allCoords.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteMap;
