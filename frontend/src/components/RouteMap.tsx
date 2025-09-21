import L from "leaflet";
import "leaflet/dist/leaflet.css";
import React, { useEffect, useRef } from "react";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface RouteMapProps {
  routeData?: {
    route: {
      total_distance: number;
      total_driving_time: number;
      total_trip_time: number;
      segments: Array<{
        from: string;
        to: string;
        distance: number;
        driving_time: number;
      }>;
      stops: Array<{
        type: string;
        description: string;
        duration: number;
      }>;
    };
    daily_logs: any[];
    compliance: any;
  };
  pickupLocation?: { lat: number; lon: number; address: string };
  dropoffLocation?: { lat: number; lon: number; address: string };
  currentLocation?: { lat: number; lon: number; address: string };
}

const RouteMap: React.FC<RouteMapProps> = ({
  routeData,
  pickupLocation,
  dropoffLocation,
  currentLocation,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([40.7128, -74.006], 4);
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    // Add markers if locations are provided
    const markers: L.Marker[] = [];

    if (currentLocation) {
      const currentMarker = L.marker([currentLocation.lat, currentLocation.lon])
        .addTo(map)
        .bindPopup(
          `<strong>Current Location</strong><br>${currentLocation.address}`
        );
      markers.push(currentMarker);
    }

    if (pickupLocation) {
      const pickupMarker = L.marker([pickupLocation.lat, pickupLocation.lon])
        .addTo(map)
        .bindPopup(`<strong>Pickup</strong><br>${pickupLocation.address}`);
      markers.push(pickupMarker);
    }

    if (dropoffLocation) {
      const dropoffMarker = L.marker([dropoffLocation.lat, dropoffLocation.lon])
        .addTo(map)
        .bindPopup(`<strong>Dropoff</strong><br>${dropoffLocation.address}`);
      markers.push(dropoffMarker);
    }

    // Fit map to show all markers
    if (markers.length > 0) {
      const group = new L.FeatureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [currentLocation, pickupLocation, dropoffLocation]);

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

      {/* Route Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="text-center bg-blue-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">
            {routeData.route.total_distance}
          </div>
          <div className="text-sm text-blue-800">Total Distance (miles)</div>
        </div>
        <div className="text-center bg-green-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-600">
            {routeData.route.total_driving_time}
          </div>
          <div className="text-sm text-green-800">Driving Time (hours)</div>
        </div>
        <div className="text-center bg-purple-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-purple-600">
            {routeData.route.total_trip_time}
          </div>
          <div className="text-sm text-purple-800">Total Time (hours)</div>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-64 rounded-lg overflow-hidden border">
        <div ref={mapRef} className="w-full h-full"></div>
      </div>

      {/* Route Segments */}
      {routeData.route.segments && routeData.route.segments.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-900 mb-2">Route Segments</h4>
          <div className="space-y-2">
            {routeData.route.segments.map((segment, index) => (
              <div
                key={index}
                className="flex justify-between items-center bg-gray-50 p-3 rounded"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {segment.from} → {segment.to}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {segment.distance} mi • {segment.driving_time}h
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Required Stops */}
      {routeData.route.stops && routeData.route.stops.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-900 mb-2">Required Stops</h4>
          <div className="space-y-2">
            {routeData.route.stops.map((stop, index) => (
              <div
                key={index}
                className="flex justify-between items-center bg-yellow-50 p-3 rounded"
              >
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                  <span className="text-sm">{stop.description}</span>
                </div>
                <span className="text-sm font-medium text-yellow-800">
                  {stop.duration}h
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Status */}
      {routeData.compliance && (
        <div
          className="mt-4 p-3 rounded-lg"
          style={{
            backgroundColor: routeData.compliance.compliant
              ? "#D1FAE5"
              : "#FEF3C7",
            border: `1px solid ${
              routeData.compliance.compliant ? "#10B981" : "#F59E0B"
            }`,
          }}
        >
          <div className="flex items-center">
            <span className="text-lg mr-2">
              {routeData.compliance.compliant ? "✅" : "⚠️"}
            </span>
            <div>
              <div
                className="font-medium"
                style={{
                  color: routeData.compliance.compliant ? "#065F46" : "#92400E",
                }}
              >
                {routeData.compliance.compliant
                  ? "ELD Compliant"
                  : "ELD Compliance Issues"}
              </div>
              <div
                className="text-sm"
                style={{
                  color: routeData.compliance.compliant ? "#047857" : "#B45309",
                }}
              >
                {routeData.compliance.compliant
                  ? "Trip meets all federal regulations"
                  : "Review compliance requirements"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteMap;
