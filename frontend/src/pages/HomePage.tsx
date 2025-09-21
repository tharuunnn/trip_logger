import { Link } from "react-router-dom";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Welcome to Trip Logger
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Your comprehensive solution for US trucker trip management, ELD
            compliance, and route optimization.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Trip Management */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">🚛</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Trip Management
                    </h3>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">
                    Create, track, and manage your trucking trips with pickup
                    and dropoff locations.
                  </p>
                </div>
              </div>
            </div>

            {/* ELD Compliance */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">📋</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      ELD Compliance
                    </h3>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">
                    Generate daily logs and ensure compliance with federal ELD
                    regulations.
                  </p>
                </div>
              </div>
            </div>

            {/* Route Optimization */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">🗺️</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Route Optimization
                    </h3>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">
                    Calculate optimal routes with rest breaks, fuel stops, and
                    compliance checks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-20 text-center">
          <div className="bg-blue-600 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              Ready to Start Your Trip?
            </h2>
            <p className="text-blue-100 mb-6">
              Create your first trip and let our system handle the rest.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/trips"
                className="bg-white text-blue-600 px-6 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors"
              >
                View All Trips
              </Link>
              <Link
                to="/trips/new"
                className="bg-blue-500 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-400 transition-colors"
              >
                Create New Trip
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-20">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Quick Stats
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">11</div>
                <div className="text-sm text-gray-500">Hour Driving Limit</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">10</div>
                <div className="text-sm text-gray-500">Hour Break Required</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">30</div>
                <div className="text-sm text-gray-500">Min Rest Break</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
