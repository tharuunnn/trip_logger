import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL ? 
    `${import.meta.env.VITE_BACKEND_URL}/api` : 
    "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    // Normalize backend (DRF) error shapes into a single error.message string
    const data = error.response?.data;
    let message = "Request failed";

    if (data) {
      if (typeof data === "string") {
        message = data;
      } else if (Array.isArray(data?.non_field_errors) && data.non_field_errors.length) {
        // Most DRF validation errors for object-level validations end up here
        message = String(data.non_field_errors[0]);
      } else if (typeof data?.detail === "string") {
        message = data.detail;
      } else if (typeof data === "object") {
        // Try to extract the first field error, e.g., { start_hour: ["Must be within 0-24."] }
        const keys = Object.keys(data);
        if (keys.length) {
          const k = keys[0];
          const v = (data as any)[k];
          if (Array.isArray(v) && v.length) {
            message = `${k}: ${String(v[0])}`;
          } else if (typeof v === "string") {
            message = `${k}: ${v}`;
          }
        }
      }
    } else if (error.message) {
      message = error.message;
    }

    // Attach normalized message so callers can display it directly
    error.message = message;
    console.error("API Response Error:", data || message);
    return Promise.reject(error);
  }
);

// Trip API functions
export const tripAPI = {
  // Get all trips
  getTrips: () => api.get("/trips/"),

  // Get trip by ID
  getTrip: (id: number) => api.get(`/trips/${id}/`),

  // Create new trip
  createTrip: (data: any) => api.post("/trips/", data),

  // Update trip
  updateTrip: (id: number, data: any) => api.put(`/trips/${id}/`, data),

  // Partial update trip (for status updates)
  patchTrip: (id: number, data: any) => api.patch(`/trips/${id}/`, data),

  // Delete trip
  deleteTrip: (id: number) => api.delete(`/trips/${id}/`),

  // Calculate route for trip
  calculateRoute: (id: number, currentLocation: any) =>
    api.post(`/trips/${id}/calculate_route/`, {
      current_location: currentLocation,
    }),

  // Get dynamic cycle remaining for a trip
  cycleRemaining: (id: number) => api.get(`/trips/${id}/cycle_remaining/`),

  // Get trip logs
  getTripLogs: (id: number) => api.get(`/trips/${id}/logs/`),
};

// Daily Log API functions
export const logAPI = {
  // Get all logs
  getLogs: () => api.get("/logs/"),

  // Get log by ID
  getLog: (id: number) => api.get(`/logs/${id}/`),

  // Create new log
  createLog: (data: any) => api.post("/logs/", data),

  // Update log
  updateLog: (id: number, data: any) => api.put(`/logs/${id}/`, data),

  // Delete log
  deleteLog: (id: number) => api.delete(`/logs/${id}/`),

  // Get logs by trip
  getLogsByTrip: (tripId: number) => api.get(`/logs/?trip_id=${tripId}`),
};

// Test API connection
export const testAPI = {
  hello: () => api.get("/hello/"),
};

// Log Entry API functions
export const entryAPI = {
  // Create new entry
  createEntry: (data: any) => api.post("/entries/", data),

  // Get entries by daily_log id
  getEntriesByDailyLog: (dailyLogId: number) =>
    api.get(`/entries/?daily_log_id=${dailyLogId}`),

  // Get entries by trip and day
  getEntriesByTripDay: (tripId: number, day: string) =>
    api.get(`/entries/?trip_id=${tripId}&day=${encodeURIComponent(day)}`),
};

export default api;
