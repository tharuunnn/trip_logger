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
      combined_coordinates?: [number, number][];
      segments: Array<{
        from: string;
        to: string;
        distance: number;
        driving_time: number;
        coordinates?: [number, number][];
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
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5); // Default: India centered
    mapInstanceRef.current = map;

    console.log("Leaflet map initialized", {
      hasContainer: !!mapRef.current,
      size: map.getSize(),
    });

    const tiles = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: "© OpenStreetMap contributors",
      }
    ).addTo(map);
    tiles.on("tileloadstart", (e: any) =>
      console.log("tileloadstart", e.coords)
    );
    tiles.on("tileload", (e: any) => console.log("tileload", e.coords));
    tiles.on("tileerror", (e: any) => console.error("tileerror", e.coords));

    // Group for markers
    markersRef.current = L.layerGroup().addTo(map);

    // Invalidate size after initial render to avoid blank tiles
    setTimeout(() => {
      try {
        map.invalidateSize(true);
        console.log("Map size invalidated after init", map.getSize());
      } catch (e) {
        console.error("invalidateSize after init failed", e);
      }
    }, 0);
  }, []);

  ////////////
  // debug  - checking coords in frontend
  // Add this test in your RouteMap component to verify it works with mock data:

  useEffect(() => {
    // TEMPORARY: Test with mock data
    if (!routeData && currentLocation && pickupLocation) {
      console.log("Testing with mock route data...");

      // Create mock coordinates for testing
      const mockRouteData = {
        route: {
          total_distance: 500,
          total_driving_time: 8,
          total_trip_time: 9,
          segments: [
            {
              from: currentLocation.address,
              to: pickupLocation.address,
              distance: 300,
              driving_time: 5,
              coordinates: [
                [currentLocation.lat, currentLocation.lon],
                [
                  (currentLocation.lat + pickupLocation.lat) / 2,
                  (currentLocation.lon + pickupLocation.lon) / 2,
                ],
                [pickupLocation.lat, pickupLocation.lon],
              ],
            },
            {
              from: pickupLocation.address,
              to: dropoffLocation?.address || "Test Destination",
              distance: 200,
              driving_time: 3,
              coordinates: [
                [pickupLocation.lat, pickupLocation.lon],
                [pickupLocation.lat + 1, pickupLocation.lon + 1],
                [dropoffLocation?.lat || 20, dropoffLocation?.lon || 80],
              ],
            },
          ],
          stops: [],
        },
        daily_logs: [],
        compliance: { compliant: true },
      };

      console.log("Mock route data created:", mockRouteData);

      // You can temporarily set this to test:
      // setRouteData(mockRouteData); // if you have state management
    }
  }, [currentLocation, pickupLocation, dropoffLocation, routeData]);

  /////////

  // Update markers + polyline whenever props change
  useEffect(() => {
    console.log("RouteMap update effect", {
      hasRouteData: !!routeData,
      segCount: routeData?.route?.segments?.length || 0,
      combinedLen: routeData?.route?.combined_coordinates?.length || 0,
      hasCurrent: !!currentLocation,
      hasPickup: !!pickupLocation,
      hasDropoff: !!dropoffLocation,
    });
    const map = mapInstanceRef.current;
    if (!map) return;

    try {
      const size = map.getSize();
      console.log("Map size before draw:", size);
      if (mapRef.current) {
        (mapRef.current as HTMLDivElement).style.background = "#f3f4f6"; // light gray for visibility
      }
    } catch (e) {
      console.warn("Could not read map size", e);
    }

    // Clear old markers
    markersRef.current?.clearLayers();

    const markers: L.Marker[] = [];

    if (currentLocation) {
      const currentMarker = L.marker([
        currentLocation.lat,
        currentLocation.lon,
      ]).bindPopup(
        `<strong>Current Location</strong><br>${currentLocation.address}`
      );
      markersRef.current?.addLayer(currentMarker);
      markers.push(currentMarker);
    }

    if (pickupLocation) {
      const pickupMarker = L.marker([
        pickupLocation.lat,
        pickupLocation.lon,
      ]).bindPopup(`<strong>Pickup</strong><br>${pickupLocation.address}`);
      markersRef.current?.addLayer(pickupMarker);
      markers.push(pickupMarker);
    }

    if (dropoffLocation) {
      const dropoffMarker = L.marker([
        dropoffLocation.lat,
        dropoffLocation.lon,
      ]).bindPopup(`<strong>Dropoff</strong><br>${dropoffLocation.address}`);
      markersRef.current?.addLayer(dropoffMarker);
      markers.push(dropoffMarker);
    }

    // Draw polyline
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    let allCoords = routeData?.route?.segments?.flatMap(
      (seg) => seg.coordinates || []
    );

    // Fallback: use combined polyline from backend if segments have no coordinates
    if (!allCoords || allCoords.length === 0) {
      allCoords = routeData?.route?.combined_coordinates || [];
    }
    // Filter out invalid coordinate pairs
    allCoords = (allCoords || []).filter(
      (c) =>
        Array.isArray(c) && c.length === 2 && isFinite(c[0]) && isFinite(c[1])
    );
    console.log("Total coordinates for polyline:", allCoords?.length);
    if (allCoords?.length > 0) {
      try {
        console.log(
          "First coord:",
          allCoords[0],
          "Last coord:",
          allCoords[allCoords.length - 1]
        );
        // Center map on first coordinate to force a visible view
        try {
          map.setView(allCoords[0] as L.LatLngExpression, 10);
          L.circle(allCoords[0] as L.LatLngExpression, {
            radius: 100,
            color: "red",
          }).addTo(map);
        } catch (e) {
          console.warn("Centering on first coord failed", e);
        }
        routeLayerRef.current = L.polyline(allCoords, {
          color: "#7c3aed",
          weight: 4,
        }).addTo(map);

        console.log("Polyline added to map?", !!routeLayerRef.current);

        if (routeLayerRef.current) {
          const b = routeLayerRef.current.getBounds();
          console.log("Bounds:", b.toBBoxString());
          // Draw a rectangle to visually assert bounds on the map
          try {
            L.rectangle(b, { color: "#00ff00", weight: 1 }).addTo(map);
          } catch (e) {
            console.warn("Rectangle draw failed", e);
          }
          map.fitBounds(b.pad(0.1));
          setTimeout(() => map.invalidateSize(true), 0);
        }
      } catch (e) {
        console.error("Error drawing polyline", e);
      }
    } else if (markers.length > 0) {
      // Fit to markers if no polyline
      const group = new L.FeatureGroup(markers);
      console.log("Fitting map to markers");
      map.fitBounds(group.getBounds().pad(0.1));
      setTimeout(() => map.invalidateSize(true), 0);
    }
  }, [routeData, currentLocation, pickupLocation, dropoffLocation]);

  if (!routeData) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4">Route Map</h3>
        <div className="h-64 bg-gray-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-4xl mb-2">🗺️</div>
            <p className="text-gray-600 dark:text-neutral-300">Calculate route to see map</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4">Route Map</h3>

      {/* Route Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="text-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-violet-600">
            {routeData.route.total_distance.toFixed(2)}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-300">Total Distance (miles)</div>
        </div>
        <div className="text-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-violet-600">
            {routeData.route.total_driving_time.toFixed(2)}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-300">Driving Time (hours)</div>
        </div>
        <div className="text-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-violet-600">
            {routeData.route.total_trip_time.toFixed(2)}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-300">Total Time (hours)</div>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-64 rounded-lg overflow-hidden border relative" style={{borderColor:'var(--border)'}}>
        <div
          ref={mapRef}
          className="w-full h-full"
          style={{ height: "256px", minHeight: "256px" }}
        ></div>
        {routeData && (
          <div className="absolute top-1 left-1 bg-white/80 text-xs px-2 py-1 rounded shadow">
            coords: {routeData?.route?.combined_coordinates?.length || 0}
          </div>
        )}
      </div>

      {/* Route Segments */}
      {routeData.route.segments?.length > 0 && (
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
                  {segment.distance.toFixed(2)} mi •{" "}
                  {segment.driving_time.toFixed(2)}h
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Required Stops */}
      {routeData.route.stops?.length > 0 && (
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
