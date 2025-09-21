import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="bg-blue-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <h1 className="text-white text-xl font-bold">🚛 Trip Logger</h1>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === "/"
                  ? "bg-blue-700 text-white"
                  : "text-blue-100 hover:bg-blue-500 hover:text-white"
              }`}
            >
              Home
            </Link>
            <Link
              to="/trips"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname.startsWith("/trips")
                  ? "bg-blue-700 text-white"
                  : "text-blue-100 hover:bg-blue-500 hover:text-white"
              }`}
            >
              Trips
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
