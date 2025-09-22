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
    
    def _get_cache_key(self, start_coords: Tuple[float, float], 
                      end_coords: Tuple[float, float]) -> str:
        """Generate cache key for route calculation."""
        coords_str = f"{start_coords[0]},{start_coords[1]}_{end_coords[0]},{end_coords[1]}"
        return f"route_{hashlib.md5(coords_str.encode()).hexdigest()}"
    
    def get_route(self, start_coords: Tuple[float, float], 
                  end_coords: Tuple[float, float]) -> Dict:
        """
        Get route from OpenRouteService API with caching.
        
        Args:
            start_coords: (latitude, longitude) of start point
            end_coords: (latitude, longitude) of end point
        
        Returns:
            Dictionary containing route information
        """
        # Check cache first
        cache_key = self._get_cache_key(start_coords, end_coords)
        cached_result = cache.get(cache_key)
        
        if cached_result:
            logger.info(f"Route found in cache for {start_coords} -> {end_coords}")
            return cached_result
        
        # Make API request
        url = f"{self.base_url}/directions/driving-car"
        
        payload = {
            "coordinates": [list(start_coords), list(end_coords)],
            "format": "json",
            "options": {
                "avoid_borders": "controlled",
                "avoid_countries": [],
                "avoid_features": [],
                "avoid_polygons": []
            }
        }
        
        try:
            response = requests.post(url, headers=self.headers, json=payload, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if 'features' not in data or not data['features']:
                raise Exception("No route found")
            
            # Extract route information
            route_info = self._parse_route_response(data)
            
            # Cache the result for 1 hour
            cache.set(cache_key, route_info, 3600)
            logger.info(f"Route calculated and cached for {start_coords} -> {end_coords}")
            
            return route_info
            
        except requests.exceptions.RequestException as e:
            logger.error(f"OpenRouteService API error: {e}")
            raise Exception(f"Failed to calculate route: {e}")
        except Exception as e:
            logger.error(f"Route calculation error: {e}")
            raise
    
    def _parse_route_response(self, data: Dict) -> Dict:
        """Parse OpenRouteService API response."""
        feature = data['features'][0]
        properties = feature['properties']
        geometry = feature['geometry']
        
        # Calculate distance and duration
        distance_meters = properties['summary']['distance']
        duration_seconds = properties['summary']['duration']
        
        # Convert to miles and hours
        distance_miles = distance_meters * 0.000621371
        duration_hours = duration_seconds / 3600
        
        return {
            'distance_miles': round(distance_miles, 2),
            'duration_hours': round(duration_hours, 2),
            'distance_meters': distance_meters,
            'duration_seconds': duration_seconds,
            'coordinates': geometry['coordinates'],
            'summary': properties['summary']
        }


def calculate_trip_route(current_location: Dict, pickup_location: Dict, 
                         dropoff_location: Dict, average_speed: float = 55.0) -> Dict:
    """
    Calculate complete trip route: Current → Pickup → Dropoff using OpenRouteService.
    
    Args:
        current_location: {'lat': float, 'lon': float, 'address': str}
        pickup_location: {'lat': float, 'lon': float, 'address': str}
        dropoff_location: {'lat': float, 'lon': float, 'address': str}
        average_speed: Average driving speed in mph (default: 55 mph)
    
    Returns:
        Dictionary containing route details, stops, and timing
    """
    ors_client = OpenRouteServiceClient()
    
    try:
        # Calculate current to pickup route
        current_to_pickup = ors_client.get_route(
            (current_location['lat'], current_location['lon']),
            (pickup_location['lat'], pickup_location['lon'])
        )
        
        # Calculate pickup to dropoff route
        pickup_to_dropoff = ors_client.get_route(
            (pickup_location['lat'], pickup_location['lon']),
            (dropoff_location['lat'], dropoff_location['lon'])
        )
        
        total_distance = current_to_pickup['distance_miles'] + pickup_to_dropoff['distance_miles']
        total_driving_time = current_to_pickup['duration_hours'] + pickup_to_dropoff['duration_hours']
        
        # Calculate stops
        stops = calculate_trip_stops(total_driving_time, total_distance)
        
        # Calculate total trip time including stops
        total_trip_time = total_driving_time + sum(stop['duration'] for stop in stops)
        
        return {
            'total_distance': total_distance,
            'total_driving_time': round(total_driving_time, 2),
            'total_trip_time': round(total_trip_time, 2),
            'segments': [
                {
                    'from': current_location['address'],
                    'to': pickup_location['address'],
                    'distance': current_to_pickup['distance_miles'],
                    'driving_time': current_to_pickup['duration_hours']
                },
                {
                    'from': pickup_location['address'],
                    'to': dropoff_location['address'],
                    'distance': pickup_to_dropoff['distance_miles'],
                    'driving_time': pickup_to_dropoff['duration_hours']
                }
            ],
            'stops': stops,
            'fuel_required': calculate_fuel_requirement(total_distance),
            'api_used': True  # Flag to indicate API was used
        }
        
    except Exception as e:
        logger.error(f"Route calculation failed: {e}")
        # Fallback to basic calculation if API fails
        return _fallback_route_calculation(current_location, pickup_location, dropoff_location)


def _fallback_route_calculation(current_location: Dict, pickup_location: Dict, 
                               dropoff_location: Dict) -> Dict:
    """Fallback route calculation if OpenRouteService API fails."""
    logger.warning("Using fallback route calculation")
    
    # Simple distance calculation (not accurate but functional)
    def simple_distance(lat1, lon1, lat2, lon2):
        return ((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2) ** 0.5 * 69  # Rough miles
    
    current_to_pickup_dist = simple_distance(
        current_location['lat'], current_location['lon'],
        pickup_location['lat'], pickup_location['lon']
    )
    
    pickup_to_dropoff_dist = simple_distance(
        pickup_location['lat'], pickup_location['lon'],
        dropoff_location['lat'], dropoff_location['lon']
    )
    
    total_distance = current_to_pickup_dist + pickup_to_dropoff_dist
    total_driving_time = total_distance / 55.0  # Assume 55 mph
    
    stops = calculate_trip_stops(total_driving_time, total_distance)
    total_trip_time = total_driving_time + sum(stop['duration'] for stop in stops)
    
    return {
        'total_distance': round(total_distance, 2),
        'total_driving_time': round(total_driving_time, 2),
        'total_trip_time': round(total_trip_time, 2),
        'segments': [
            {
                'from': current_location['address'],
                'to': pickup_location['address'],
                'distance': round(current_to_pickup_dist, 2),
                'driving_time': round(current_to_pickup_dist / 55.0, 2)
            },
            {
                'from': pickup_location['address'],
                'to': dropoff_location['address'],
                'distance': round(pickup_to_dropoff_dist, 2),
                'driving_time': round(pickup_to_dropoff_dist / 55.0, 2)
            }
        ],
        'stops': stops,
        'fuel_required': calculate_fuel_requirement(total_distance),
        'api_used': False  # Flag to indicate fallback was used
    }


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


# Sample usage functions
def sample_route_calculation():
    """Sample usage of route calculation."""
    current = {'lat': 40.7128, 'lon': -74.0060, 'address': 'New York, NY'}
    pickup = {'lat': 41.8781, 'lon': -87.6298, 'address': 'Chicago, IL'}
    dropoff = {'lat': 34.0522, 'lon': -118.2437, 'address': 'Los Angeles, CA'}
    
    route = calculate_trip_route(current, pickup, dropoff)
    print("Sample Route Calculation:")
    print(f"Total Distance: {route['total_distance']} miles")
    print(f"Total Driving Time: {route['total_driving_time']} hours")
    print(f"Total Trip Time: {route['total_trip_time']} hours")
    print(f"Stops Required: {len(route['stops'])}")
    print(f"API Used: {route['api_used']}")
    return route


def sample_daily_logs():
    """Sample usage of daily log generation."""
    start_time = datetime.now()
    trip_duration = 25.0  # 25 hours
    cycle_used = 2.0  # 2 hours already used
    
    logs = generate_daily_logs(start_time, trip_duration, cycle_used, "John Doe")
    print("Sample Daily Logs:")
    for log in logs:
        print(f"Day {log['day']}: {log['driving_hours']}h driving, {log['status']}")
    return logs
