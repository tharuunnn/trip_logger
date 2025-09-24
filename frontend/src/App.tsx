import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import { ThemeProvider } from "./contexts/ThemeContext";
import "./index.css";
import DailyLogFormPage from "./pages/DailyLogFormPage";
import HomePage from "./pages/HomePage";
import TripDetailPage from "./pages/TripDetailPage";
import TripFormPage from "./pages/TripFormPage";
import TripsPage from "./pages/TripsPage";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 transition-colors duration-200">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/trips/new" element={<TripFormPage />} />
            <Route path="/trips/:id" element={<TripDetailPage />} />
            <Route
              path="/trips/:tripId/logs/new"
              element={<DailyLogFormPage />}
            />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
