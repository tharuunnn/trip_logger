"""
Test script for Trip Logger core logic functions with OpenRouteService API.
Run this to see sample outputs of the utility functions.
"""

import os
import sys
import django

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from trips.utils import (
    calculate_trip_route,
    generate_daily_logs,
    calculate_eld_compliance,
    sample_route_calculation,
    sample_daily_logs
)
from datetime import datetime

def test_route_calculation():
    """Test route calculation with sample data."""
    print("=" * 50)
    print("ROUTE CALCULATION TEST (OpenRouteService API)")
    print("=" * 50)
    
    # Sample locations
    current = {
        'lat': 40.7128, 'lon': -74.0060, 
        'address': 'New York, NY'
    }
    pickup = {
        'lat': 41.8781, 'lon': -87.6298, 
        'address': 'Chicago, IL'
    }
    dropoff = {
        'lat': 34.0522, 'lon': -118.2437, 
        'address': 'Los Angeles, CA'
    }
    
    try:
        route = calculate_trip_route(current, pickup, dropoff)
        
        print(f"Route: {current['address']} → {pickup['address']} → {dropoff['address']}")
        print(f"Total Distance: {route['total_distance']} miles")
        print(f"Total Driving Time: {route['total_driving_time']} hours")
        print(f"Total Trip Time: {route['total_trip_time']} hours")
        print(f"Fuel Required: {route['fuel_required']['gallons_needed']} gallons")
        print(f"Estimated Fuel Cost: ${route['fuel_required']['estimated_cost']}")
        print(f"API Used: {route.get('api_used', 'Unknown')}")
        
        print("\nRoute Segments:")
        for i, segment in enumerate(route['segments'], 1):
            print(f"  {i}. {segment['from']} → {segment['to']}")
            print(f"     Distance: {segment['distance']} miles")
            print(f"     Driving Time: {segment['driving_time']} hours")
        
        print(f"\nRequired Stops ({len(route['stops'])} total):")
        for stop in route['stops']:
            print(f"  - {stop['description']} ({stop['duration']}h)")
        
        return route
        
    except Exception as e:
        print(f"Error calculating route: {e}")
        print("This might be due to missing API key or network issues.")
        return None


def test_daily_logs():
    """Test daily log generation."""
    print("\n" + "=" * 50)
    print("DAILY LOG GENERATION TEST")
    print("=" * 50)
    
    # Sample trip parameters
    start_time = datetime(2024, 1, 15, 8, 0)  # Jan 15, 2024 at 8 AM
    trip_duration = 25.0  # 25 hours total
    cycle_used = 2.0  # 2 hours already used in current cycle
    driver_name = "John Smith"
    
    logs = generate_daily_logs(start_time, trip_duration, cycle_used, driver_name)
    
    print(f"Trip Start: {start_time}")
    print(f"Trip Duration: {trip_duration} hours")
    print(f"Cycle Used: {cycle_used} hours")
    print(f"Driver: {driver_name}")
    
    print(f"\nGenerated {len(logs)} daily logs:")
    for i, log in enumerate(logs, 1):
        print(f"  Day {i} ({log['day']}):")
        print(f"    Driving: {log['driving_hours']} hours")
        print(f"    Off-duty: {log['off_duty_hours']} hours")
        print(f"    Status: {log['status']}")
        print(f"    Remarks: {log['remarks']}")
        print()
    
    return logs


def test_eld_compliance():
    """Test ELD compliance checking."""
    print("=" * 50)
    print("ELD COMPLIANCE TEST")
    print("=" * 50)
    
    # Test different scenarios
    scenarios = [
        {"duration": 8.0, "cycle_used": 0.0, "description": "Short trip, fresh cycle"},
        {"duration": 15.0, "cycle_used": 2.0, "description": "Long trip, some cycle used"},
        {"duration": 25.0, "cycle_used": 5.0, "description": "Very long trip, significant cycle used"},
    ]
    
    for scenario in scenarios:
        compliance = calculate_eld_compliance(
            scenario['duration'], 
            scenario['cycle_used']
        )
        
        print(f"\nScenario: {scenario['description']}")
        print(f"Trip Duration: {scenario['duration']} hours")
        print(f"Cycle Used: {scenario['cycle_used']} hours")
        print(f"Compliant: {compliance['compliant']}")
        print(f"Cycles Needed: {compliance['cycles_needed']}")
        print(f"Remaining Cycle Hours: {compliance['remaining_cycle_hours']}")
        print(f"Total Break Time: {compliance['total_break_time']} hours")
        print("Recommendations:")
        for rec in compliance['recommendations']:
            print(f"  - {rec}")


if __name__ == "__main__":
    print("TRIP LOGGER CORE LOGIC TEST (OpenRouteService API)")
    print("Testing utility functions...")
    
    # Check if API key is configured
    from django.conf import settings
    if not hasattr(settings, 'ORS_API_KEY') or not settings.ORS_API_KEY:
        print("\n⚠️  WARNING: ORS_API_KEY not configured!")
        print("Please set your OpenRouteService API key in .env file")
        print("The route calculation will use fallback method.")
    
    # Run all tests
    route = test_route_calculation()
    logs = test_daily_logs()
    test_eld_compliance()
    
    print("\n" + "=" * 50)
    print("ALL TESTS COMPLETED!")
    print("=" * 50)
    print("\nNote: Route calculations are cached for 1 hour to preserve API calls.")
    print("Rate limiting: 10 route calculations per hour per IP address.")
