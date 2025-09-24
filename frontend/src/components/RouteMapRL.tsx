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

// Use a custom tuple alias name to avoid confusion with Leaflet's LatLng class
type Coord = [number, number];

// Loosen typings from react-leaflet to avoid IDE TS prop mismatches
const AnyMapContainer = MapContainer as unknown as React.ComponentType<any>;
const AnyMarker = Marker as unknown as React.ComponentType<any>;

interface RouteMapProps {
  routeData?: {
    route: {
      total_distance: number;
      total_driving_time: number;
      total_trip_time: number;
      combined_coordinates?: Coord[];
      segments: Array<{
        from: string;
        to: string;
        distance: number;
        driving_time: number;
        coordinates?: Coord[];
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

const FitBounds: React.FC<{ coords: Coord[] }> = ({ coords }) => {
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
  const allCoords: Coord[] = useMemo(() => {
    const segs =
      routeData?.route?.segments?.flatMap((s) => s.coordinates || []) || [];
    const comb = routeData?.route?.combined_coordinates || [];
    const c = segs.length > 0 ? segs : comb;
    return (c || []).filter(
      (p) =>
        Array.isArray(p) && p.length === 2 && isFinite(p[0]) && isFinite(p[1])
    ) as Coord[];
  }, [routeData]);

  // Haversine distance between two [lat, lon] points in miles
  const distanceMiles = (a: Coord, b: Coord) => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 3958.7613; // Earth radius in miles
    const dLat = toRad(b[0] - a[0]);
    const dLon = toRad(b[1] - a[1]);
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
  };

  // Compute approximate fuel stops every ~1000 miles along the polyline
  const fuelStops: Coord[] = useMemo(() => {
    const result: Coord[] = [];
    if (!allCoords || allCoords.length < 2) return result;

    let accumulated = 0;
    let nextTarget = 1000; // miles
    for (let i = 1; i < allCoords.length; i++) {
      const segDist = distanceMiles(allCoords[i - 1], allCoords[i]);
      if (!isFinite(segDist)) continue;
      accumulated += segDist;
      // If we crossed the next 1000-mi threshold, place a marker near this point
      while (accumulated >= nextTarget) {
        result.push(allCoords[i]);
        nextTarget += 1000;
      }
      // Safety: cap stops to the total distance/1000 if provided
      const total = Number(routeData?.route?.total_distance) || 0;
      const maxStops = Math.floor(total / 1000);
      if (maxStops > 0 && result.length >= maxStops) break;
    }
    return result;
  }, [allCoords, routeData?.route?.total_distance]);

  // Helper: create a small colored dot icon
  const makeDotIcon = (color: string) =>
    L.divIcon({
      className: "",
      html: `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.5);"></span>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Route Map</h3>

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

      <div className="h-64 rounded-lg overflow-hidden border border-[color:var(--border)] relative" style={{ background: 'var(--surface)' }}>
        {(() => {
          // Build bounds: if we have coords, fit to them; else a small default box
          const defaultCenter: Coord = [20.5937, 78.9629];
          const defaultBounds: [Coord, Coord] = [
            [defaultCenter[0] - 2, defaultCenter[1] - 2],
            [defaultCenter[0] + 2, defaultCenter[1] + 2],
          ];
          const bounds = allCoords.length > 1 ? (L.latLngBounds(allCoords as any) as any) : defaultBounds;
          return (
            <AnyMapContainer
              style={{ height: 256, width: "100%" }}
              bounds={bounds}
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
            <AnyMarker
              position={[currentLocation.lat, currentLocation.lon]}
              icon={makeDotIcon("#f59e0b")}
            >
              <Popup>
                <strong>Current</strong>
                <div>{currentLocation.address}</div>
              </Popup>
            </AnyMarker>
          )}
          {pickupLocation && (
            <AnyMarker
              position={[pickupLocation.lat, pickupLocation.lon]}
              icon={makeDotIcon("#10b981")}
            >
              <Popup>
                <strong>Pickup</strong>
                <div>{pickupLocation.address}</div>
              </Popup>
            </AnyMarker>
          )}
          {dropoffLocation && (
            <AnyMarker
              position={[dropoffLocation.lat, dropoffLocation.lon]}
              icon={makeDotIcon("#ef4444")}
            >
              <Popup>
                <strong>Dropoff</strong>
                <div>{dropoffLocation.address}</div>
              </Popup>
            </AnyMarker>
          )}

          {/* Fuel stop markers (blue) roughly every 1000mi */}
          {fuelStops.map((pt, idx) => (
            <AnyMarker key={`fuel-${idx}`} position={pt} icon={makeDotIcon("#3b82f6")}>
              <Popup>
                <div className="text-sm">
                  <strong>Fuel Stop</strong>
                  <div>Approx every 1000 miles</div>
                </div>
              </Popup>
            </AnyMarker>
          ))}
            </AnyMapContainer>
          );
        })()}
        {routeData && (
          <div className="absolute top-1 left-1 text-xs px-2 py-1 rounded shadow space-y-1 bg-white/80 dark:bg-gray-900/70 text-gray-800 dark:text-gray-100">
            <div>coords: {allCoords.length}</div>
            <div className="flex items-center space-x-2">
              <span className="inline-block w-2 h-2 rounded-sm" style={{background:'#f59e0b'}}></span>
              <span>Current</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-block w-2 h-2 rounded-sm" style={{background:'#10b981'}}></span>
              <span>Pickup</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-block w-2 h-2 rounded-sm" style={{background:'#ef4444'}}></span>
              <span>Dropoff</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-block w-2 h-2 rounded-sm" style={{background:'#3b82f6'}}></span>
              <span>Fuel (1000mi)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteMap;
