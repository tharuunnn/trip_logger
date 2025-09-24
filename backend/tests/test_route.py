from django.test import TestCase
from django.conf import settings
from trips.utils import OpenRouteServiceClient

class ORSClientTestCase(TestCase):
    def setUp(self):
        self.client = OpenRouteServiceClient()
        # Coordinates: [lon, lat]
        self.start_coords = (-74.0060, 40.7128)   # New York City
        self.end_coords = (-75.1652, 39.9526)     # Philadelphia

        # DEBUG prints
        print("API Key being used:", settings.ORS_API_KEY)
        print("Start coords:", self.start_coords)
        print("End coords:", self.end_coords)

    def test_get_route(self):
        """Test basic US route calculation."""
        print("Running test_get_route...")
        try:
            route = self.client.get_route(self.start_coords, self.end_coords)
            print("Route successfully calculated:")
            print(route)
            # Basic assertions
            self.assertIn('distance_miles', route)
            self.assertIn('duration_hours', route)
            self.assertGreater(route['distance_miles'], 0)
            self.assertGreater(route['duration_hours'], 0)
        except Exception as e:
            self.fail(f"Route calculation failed: {e}")
