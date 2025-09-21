import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
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
    console.error("API Response Error:", error.response?.data || error.message);
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

  // Delete trip
  deleteTrip: (id: number) => api.delete(`/trips/${id}/`),

  // Calculate route for trip
  calculateRoute: (id: number, currentLocation: any) =>
    api.post(`/trips/${id}/calculate_route/`, {
      current_location: currentLocation,
    }),

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

export default api;
