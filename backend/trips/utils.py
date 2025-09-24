"""
Core utility functions for Trip Logger application.

This module contains the business logic for:
- Route calculation using OpenRouteService API
- Stop planning (pickup, dropoff, rest breaks, fuel)
- Daily log generation for ELD compliance
- Caching and  for API calls (ratelimiting handled in views.py)
"""

import requests
import hashlib
import json
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from django.core.cache import cache
from django.conf import settings
from django.utils.decorators import method_decorator
import logging
import openrouteservice
from django.utils import timezone
from .models import DailyLog, LogEntry, Trip



logger = logging.getLogger(__name__)


class OpenRouteServiceClient:
    """
    Client for OpenRouteService API with caching and rate limiting.
    """
    
    
    def __init__(self):
        self.api_key = settings.ORS_API_KEY
        self.base_url = settings.ORS_BASE_URL
        self.headers = {
            'Authorization': self.api_key,
            'Content-Type': 'application/json'
        }


    ##method for caching 
    # def _get_cache_key(self, start_coords: Tuple[float, float], 
    #                   end_coords: Tuple[float, float]) -> str:
    #     """Generate cache key for route calculation."""
    #     coords_str = f"{start_coords[0]},{start_coords[1]}_{end_coords[0]},{end_coords[1]}"  # [lon, lat] format
    #     return f"route_{hashlib.md5(coords_str.encode()).hexdigest()}"
    
    
    def get_route(self, start_coords: Tuple[float, float], 
                  end_coords: Tuple[float, float]) -> Dict:
        """
        Get route from OpenRouteService API with caching.
        
        Args:
            start_coords: (longitude, latitude) of start point
            end_coords: (longitude, latitude) of end point
        
        Returns:
            Dictionary containing route information
        """


        # Check cache first
        # cache_key = self._get_cache_key(start_coords, end_coords)
        # cached_result = cache.get(cache_key)
        
        # if cached_result:
        #     logger.info(f"Route found in cache for {start_coords} -> {end_coords}")
        #     return cached_result


        
        # Make API request
        url = f"{self.base_url}/directions/driving-car"
        
        payload = {
            "coordinates": [[start_coords[0], start_coords[1]], [end_coords[0], end_coords[1]]],  # [lon, lat] format
            "format": "json"
        }

        # print("ORS API Key being used:", self.api_key)
        # print("Start coords:", start_coords)
        # print("End coords:", end_coords)
        # print("Request payload:", payload)

        
        try:
            response = requests.post(url, headers=self.headers, json=payload, timeout=30)
            # print("ORS HTTP status:", response.status_code)

            response.raise_for_status()
            
            data = response.json()
            # print("ORS response summary:", data.get('routes', [{}])[0].get('summary', {}))


            
            if 'routes' not in data or not data['routes']:
                print("No route found in ORS response")
                raise Exception("No route found")
            
            # Extract route information
            route_info = self._parse_route_response(data['routes'][0])
            
            coords_preview = route_info.get("coordinates", [])[:5]
            # print("Parsed route info (preview):", {**route_info, "coordinates": coords_preview})

            return route_info
            
        except requests.exceptions.RequestException as e:
            print("OpenRouteService API error:", e)
            raise Exception(f"Failed to calculate route: {e}")
        except Exception as e:
            print("Route calculation error:", e)
            raise
    
    def _parse_route_response(self, route: Dict) -> Dict:

        """ 
        Parse OpenRouteService API route and return frontend-friendly format.
        """
        summary = route["summary"]

        # Decode polyline to get actual coordinates for mapping, reverse them from lon lat to lat lon cause that's what lealet requires 
        decoded = openrouteservice.convert.decode_polyline(route['geometry'])['coordinates']
        geometry = [[lat, lon] for lon, lat in decoded]  # flip to Leaflet format

        # Simplify before returning
        geometry = simplify_coordinates(geometry, tolerance=0.0005)

        distance_meters = summary["distance"]
        duration_seconds = summary["duration"]

        distance_miles = distance_meters * 0.000621371
        duration_hours = duration_seconds / 3600

        return {
            "total_distance": round(distance_miles, 2),  # miles for display
            "total_driving_time": round(duration_hours, 2),  # hours for display
            "total_trip_time": round(duration_hours, 2),  # same as driving_time unless you add stops
            "segments": [
                {
                    "from": step.get("name", ""),
                    "to": step.get("name", ""),
                    "distance": step["distance"],
                    "driving_time": step["duration"],
                }
                for step in route.get("segments", [])[0].get("steps", [])
            ] if route.get("segments") else [],
            "stops": [],  # can be filled in later if you want stop info
            "coordinates": geometry,  # decoded polyline
        }



def calculate_trip_route(current_location: Dict, pickup_location: Dict, 
                         dropoff_location: Dict, average_speed: float = 55.0) -> Dict:
    """
    Calculate complete trip route: Current → Pickup → Dropoff using OpenRouteService.
    

    Args:
        current_location: {'long': float, 'lat': float, 'address': str}
        pickup_location: {'long': float, 'lat': float, 'address': str}
        dropoff_location: {'long': float, 'lat': float, 'address': str}
        average_speed: Average driving speed in mph (default: 55 mph)
    
    Returns:
        Dictionary containing route details, stops, and timing
    """
    
    ors_client = OpenRouteServiceClient()

    # Debug: log input locations
    # print(f"[DEBUG] Input Locations:\n  Current: {current_location}\n  Pickup: {pickup_location}\n  Dropoff: {dropoff_location}")

    # Validate coordinates
    for loc_name, loc in [('current', current_location), ('pickup', pickup_location), ('dropoff', dropoff_location)]:
        if not loc or loc.get('lat') in [0.0, None] or loc.get('lon') in [0.0, None]:
            error_msg = f"[ERROR] Invalid coordinates for {loc_name} location: {loc}"
            print(error_msg)
            raise ValueError(error_msg)

    try:
        # Current → Pickup
        current_to_pickup = ors_client.get_route(
            (current_location['lon'], current_location['lat']),
            (pickup_location['lon'], pickup_location['lat'])
        )

        # Pickup → Dropoff
        pickup_to_dropoff = ors_client.get_route(
            (pickup_location['lon'], pickup_location['lat']),
            (dropoff_location['lon'], dropoff_location['lat'])
        )

        # Extract coordinates for Leaflet (flip from [lon,lat] to [lat,lon])
        current_to_pickup_coords = []
        pickup_to_dropoff_coords = []
        
        #coords get flipped in parse_route
        current_to_pickup_coords = current_to_pickup['coordinates']
        pickup_to_dropoff_coords = pickup_to_dropoff['coordinates']


        total_distance =  round(current_to_pickup['total_distance'] + pickup_to_dropoff['total_distance'], 2)
        total_driving_time = current_to_pickup['total_driving_time'] + pickup_to_dropoff['total_driving_time']

        stops = calculate_trip_stops(total_driving_time, total_distance)
        total_trip_time = total_driving_time + sum(stop['duration'] for stop in stops)

        
        return {
            'total_distance': total_distance,
            'total_driving_time': round(total_driving_time, 2),
            'total_trip_time': round(total_trip_time, 2),
            'segments': [
                {
                    'from': current_location['address'],
                    'to': pickup_location['address'],
                    'distance': current_to_pickup['total_distance'],
                    'driving_time': current_to_pickup['total_driving_time'],
                    'coordinates': current_to_pickup_coords  # coords to front end 
                },
                {
                    'from': pickup_location['address'],
                    'to': dropoff_location['address'],
                    'distance': pickup_to_dropoff['total_distance'],
                    'driving_time': pickup_to_dropoff['total_driving_time'],
                    'coordinates': pickup_to_dropoff_coords  # ← ADD THIS
                }
            ],
            'combined_coordinates': current_to_pickup_coords + pickup_to_dropoff_coords,
            'stops': stops,
            'fuel_required': calculate_fuel_requirement(total_distance),
            'api_used': True
        }

    except requests.exceptions.RequestException as req_err:
        print(f"[ERROR] OpenRouteService request failed: {req_err}")
        raise
    except Exception as e:
        print(f"[ERROR] Route calculation failed: {e}")
        raise



def calculate_trip_stops(driving_time_hours: float, total_distance: float) -> List[Dict]:
    """
    Calculate all required stops for the trip.
    
    Args:
        driving_time_hours: Total driving time in hours
        total_distance: Total distance in miles
    
    Returns:
        List of stop dictionaries with type, duration, and timing
    """
    stops = []
    
    # Pickup stop (1 hour)
    stops.append({
        'type': 'pickup',
        'duration': 1.0,
        'description': 'Loading/Pickup stop',
        'mandatory': True
    })
    
    # Dropoff stop (1 hour)
    stops.append({
        'type': 'dropoff',
        'duration': 1.0,
        'description': 'Unloading/Dropoff stop',
        'mandatory': True
    })
    
    # Rest breaks: 30 minutes every 8 hours of driving
    rest_breaks_needed = int(driving_time_hours // 8)
    for i in range(rest_breaks_needed):
        stops.append({
            'type': 'rest_break',
            'duration': 0.5,
            'description': f'30-minute rest break (required after {8 * (i + 1)} hours)',
            'mandatory': True
        })
    
    # Fuel stops: every ~1000 miles
    fuel_stops_needed = int(total_distance // 1000)
    for i in range(fuel_stops_needed):
        stops.append({
            'type': 'fuel',
            'duration': 0.5,
            'description': f'Fuel stop (every ~1000 miles)',
            'mandatory': True
        })
    
    return stops


def calculate_fuel_requirement(distance: float, mpg: float = 6.5) -> Dict:
    """
    Calculate fuel requirements for the trip.
    
    Args:
        distance: Total distance in miles
        mpg: Miles per gallon (default: 6.5 for trucks)
    
    Returns:
        Dictionary with fuel calculations
    """
    gallons_needed = distance / mpg
    return {
        'gallons_needed': round(gallons_needed, 2),
        'mpg': mpg,
        'estimated_cost': round(gallons_needed * 3.50, 2)  # Assuming $3.50/gallon
    }


def generate_daily_logs(trip_start_time: datetime, trip_duration_hours: float, 
                        cycle_used_hours: float, driver_name: str) -> List[Dict]:
    """
    Generate daily ELD logs for the entire trip duration.
    
    Args:
        trip_start_time: When the trip starts
        trip_duration_hours: Total trip duration in hours
        cycle_used_hours: Hours already used in current cycle
        driver_name: Name of the driver
    
    Returns:
        List of daily log dictionaries
    """
    daily_logs = []
    current_time = trip_start_time
    remaining_trip_time = trip_duration_hours
    remaining_cycle_hours = 11.0 - cycle_used_hours  # 11-hour driving limit
    
    day_count = 0
    
    while remaining_trip_time > 0:
        day_count += 1
        day_start = current_time.date()
        
        # Calculate hours for this day
        if remaining_cycle_hours <= 0:
            # Need 10-hour break before new cycle
            daily_logs.append({
                'day': day_start,
                'driving_hours': 0,
                'off_duty_hours': 10,
                'status': 'off_duty',
                'remarks': f'10-hour break - new cycle starts'
            })
            remaining_cycle_hours = 11.0
            current_time += timedelta(hours=10)
            continue
        
        # Hours available for this day
        hours_available = min(11.0, remaining_cycle_hours, remaining_trip_time)
        hours_driving = min(hours_available, 11.0)  # Max 11 hours driving per day
        
        # Calculate off-duty hours (need 10 hours off-duty)
        off_duty_hours = 10.0
        
        # Determine status
        if hours_driving > 0:
            status = 'driving'
        else:
            status = 'off_duty'
        
        daily_logs.append({
            'day': day_start,
            'driving_hours': round(hours_driving, 2),
            'off_duty_hours': round(off_duty_hours, 2),
            'status': status,
            'remarks': f'Day {day_count} - {hours_driving}h driving, {off_duty_hours}h off-duty'
        })
        
        # Update counters
        remaining_trip_time -= hours_driving
        remaining_cycle_hours -= hours_driving
        current_time += timedelta(hours=hours_driving + off_duty_hours)
    
    return daily_logs


def calculate_eld_compliance(trip_duration_hours: float, cycle_used_hours: float) -> Dict:
    """
    Check ELD compliance for the trip.
    
    Args:
        trip_duration_hours: Total trip duration
        cycle_used_hours: Hours already used in current cycle
    
    Returns:
        Compliance status and recommendations
    """
    import math
    
    remaining_cycle_hours = 11.0 - cycle_used_hours
    cycles_needed = math.ceil(trip_duration_hours / 11.0)
    total_break_time = (cycles_needed - 1) * 10.0  # 10-hour break between cycles
    
    return {
        'compliant': trip_duration_hours <= remaining_cycle_hours or cycles_needed > 1,
        'cycles_needed': cycles_needed,
        'remaining_cycle_hours': remaining_cycle_hours,
        'total_break_time': total_break_time,
        'recommendations': [
            f"Trip requires {cycles_needed} driving cycle(s)",
            f"Total break time needed: {total_break_time} hours",
            "Ensure 10-hour off-duty break between cycles"
        ]
    }


# geocode for conversion into long and lats 
def geocode_address(address: str) -> dict:
    """
    Convert a human-readable address into lat/lon using OpenRouteService free-text geocoding.
    """
    ors_client = OpenRouteServiceClient()
    url = "https://api.openrouteservice.org/geocode/search"

    params = {
        "api_key": ors_client.api_key,
        "text": address,
        "size": 1
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if "features" not in data or not data['features']:
            raise Exception(f"No geocoding result for '{address}'")

        feature = data['features'][0]  
        lon, lat = feature['geometry']['coordinates']  # [lon, lat] format in meters
        return {"lat": lat, "lon": lon, "address": address}

    except Exception as e:
        logger.error(f"Geocoding failed for '{address}': {e}")
        return {"lat": 0.0, "lon": 0.0, "address": address}

def simplify_coordinates(coords: list, tolerance: float = 0.0005) -> list:
    """
    Reduce the number of coordinates using a simple Ramer-Douglas-Peucker algorithm.

    Args:
        coords: List of [lat, lon] points
        tolerance: Higher values = more simplification (lossy)

    Returns:
        Simplified list of coordinates
    """
    if not coords or len(coords) < 3:
        return coords

    # Using shapely if available (pip install shapely)
    try:
        from shapely.geometry import LineString
        # coords are already [lat, lon] for Leaflet; preserve order after simplification
        line = LineString(coords)
        simplified = line.simplify(tolerance, preserve_topology=False)
        return [[pt[0], pt[1]] for pt in simplified.coords]
    except ImportError:
        # fallback: naive sampling (pick every Nth point)
        n = max(1, len(coords) // 1000)  # limit to ~1000 points
        return coords[::n]


def compute_cycle_remaining(trip_id: int, as_of: Optional[datetime] = None) -> Dict:
    """
    Compute rolling 70-hour/8-day cycle hours for a trip with a simple 34-hour restart heuristic.

    - On-duty = Driving + On duty not driving
    - Off-duty = Off duty + Sleeper berth
    - Rolling window = last 8 consecutive calendar days including 'as_of' date
    - 34-hour reset: if there is a contiguous off-duty-only period >= 34 hours ending before/as_of,
      the cycle is considered reset after that break; we then only sum on-duty since that reset

    Returns a dict with used/remaining hours and window metadata.
    """
    if as_of is None:
        as_of = timezone.now()

    try:
        trip = Trip.objects.get(pk=trip_id)
    except Trip.DoesNotExist:
        return {"error": f"Trip {trip_id} not found"}

    as_of_date = as_of.date()
    window_start = as_of_date - timedelta(days=7)  # 8-day window inclusive

    # Fetch logs in window and a bit earlier to detect 34-hour reset
    lookback_start = as_of_date - timedelta(days=10)
    logs_qs = (
        DailyLog.objects.filter(trip=trip, day__gte=lookback_start, day__lte=as_of_date)
        .order_by("day")
        .prefetch_related("entries")
    )

    # Build per-day totals from entries (do not rely on rollup fields)
    day_data: Dict[str, Dict[str, float]] = {}
    for dl in logs_qs:
        on_duty = 0.0
        off_duty = 0.0
        for e in dl.entries.all():
            dur = float(e.duration_hours)
            if e.status in ("driving", "on_duty_not_driving"):
                on_duty += dur
            elif e.status in ("off_duty", "sleeper_berth"):
                off_duty += dur
        day_data[str(dl.day)] = {"on": on_duty, "off": off_duty}

    # Heuristic 34-hour restart detection: find any contiguous sequence of days with no on-duty
    # activity whose total off >= 34h. If found, reset cycle after that period.
    restart_detected = False
    restart_after_day: Optional[datetime.date] = None
    current_off_sum = 0.0
    current_seq_days: List[datetime.date] = []
    # Iterate chronologically
    day_cursor = lookback_start
    while day_cursor <= as_of_date:
        key = str(day_cursor)
        on = day_data.get(key, {}).get("on", 0.0)
        off = day_data.get(key, {}).get("off", 0.0)
        if on <= 1e-6:  # treat as off-duty-only day
            current_off_sum += off
            current_seq_days.append(day_cursor)
        else:
            current_off_sum = 0.0
            current_seq_days = []

        if current_off_sum >= 34.0:
            restart_detected = True
            restart_after_day = day_cursor
            # don't break; keep latest restart
        day_cursor += timedelta(days=1)

    # Compute rolling on-duty used in window, respecting restart
    used_hours = 0.0
    sum_start = window_start
    if restart_detected and restart_after_day and restart_after_day >= window_start:
        # Reset after the off-duty block; start sum from next day
        sum_start = restart_after_day + timedelta(days=1)

    day_cursor = sum_start
    while day_cursor <= as_of_date:
        key = str(day_cursor)
        used_hours += day_data.get(key, {}).get("on", 0.0)
        day_cursor += timedelta(days=1)

    remaining = max(0.0, 70.0 - used_hours)

    return {
        "trip_id": trip_id,
        "cycle": "70_8",
        "window_start": str(sum_start),
        "window_end": str(as_of_date),
        "used_hours": round(used_hours, 2),
        "remaining_hours": round(remaining, 2),
        "restart_detected": restart_detected,
        "restart_end_day": str(restart_after_day) if restart_after_day else None,
    }
