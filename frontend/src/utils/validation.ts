// Form validation utilities for Trip Logger

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Trip form validation
export const validateTripForm = (data: {
  driver_name: string;
  pickup_location: string;
  dropoff_location: string;
  start_time: string;
  cycle_used_hours: number;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // Driver name validation
  if (!data.driver_name.trim()) {
    errors.push({ field: "driver_name", message: "Driver name is required" });
  } else if (data.driver_name.trim().length < 2) {
    errors.push({
      field: "driver_name",
      message: "Driver name must be at least 2 characters",
    });
  } else if (data.driver_name.trim().length > 100) {
    errors.push({
      field: "driver_name",
      message: "Driver name must be less than 100 characters",
    });
  }

  // Pickup location validation
  if (!data.pickup_location.trim()) {
    errors.push({
      field: "pickup_location",
      message: "Pickup location is required",
    });
  } else if (data.pickup_location.trim().length < 5) {
    errors.push({
      field: "pickup_location",
      message: "Pickup location must be at least 5 characters",
    });
  } else if (data.pickup_location.trim().length > 200) {
    errors.push({
      field: "pickup_location",
      message: "Pickup location must be less than 200 characters",
    });
  }

  // Dropoff location validation
  if (!data.dropoff_location.trim()) {
    errors.push({
      field: "dropoff_location",
      message: "Dropoff location is required",
    });
  } else if (data.dropoff_location.trim().length < 5) {
    errors.push({
      field: "dropoff_location",
      message: "Dropoff location must be at least 5 characters",
    });
  } else if (data.dropoff_location.trim().length > 200) {
    errors.push({
      field: "dropoff_location",
      message: "Dropoff location must be less than 200 characters",
    });
  }

  // Start time validation
  if (!data.start_time) {
    errors.push({ field: "start_time", message: "Start time is required" });
  } else {
    const startDate = new Date(data.start_time);
    const now = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(now.getFullYear() + 1);

    if (startDate < now) {
      errors.push({
        field: "start_time",
        message: "Start time cannot be in the past",
      });
    } else if (startDate > oneYearFromNow) {
      errors.push({
        field: "start_time",
        message: "Start time cannot be more than 1 year in the future",
      });
    }
  }

  // Cycle used hours validation
  if (data.cycle_used_hours < 0) {
    errors.push({
      field: "cycle_used_hours",
      message: "Cycle used hours cannot be negative",
    });
  } else if (data.cycle_used_hours > 70) {
    errors.push({
      field: "cycle_used_hours",
      message: "Cycle used hours cannot exceed 70 hours (ELD limit)",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Daily log form validation
export const validateDailyLogForm = (data: {
  day: string;
  driving_hours: number;
  off_duty_hours: number;
  status: string;
  remarks?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // Day validation
  if (!data.day) {
    errors.push({ field: "day", message: "Date is required" });
  } else {
    const logDate = new Date(data.day);
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    if (logDate > now) {
      errors.push({
        field: "day",
        message: "Log date cannot be in the future",
      });
    } else if (logDate < oneYearAgo) {
      errors.push({
        field: "day",
        message: "Log date cannot be more than 1 year ago",
      });
    }
  }

  // Driving hours validation
  if (data.driving_hours < 0) {
    errors.push({
      field: "driving_hours",
      message: "Driving hours cannot be negative",
    });
  } else if (data.driving_hours > 11) {
    errors.push({
      field: "driving_hours",
      message: "Driving hours cannot exceed 11 hours (ELD limit)",
    });
  }

  // Off-duty hours validation
  if (data.off_duty_hours < 0) {
    errors.push({
      field: "off_duty_hours",
      message: "Off-duty hours cannot be negative",
    });
  } else if (data.off_duty_hours > 24) {
    errors.push({
      field: "off_duty_hours",
      message: "Off-duty hours cannot exceed 24 hours",
    });
  }

  // Total hours validation (driving + off-duty should not exceed 24)
  const totalHours = data.driving_hours + data.off_duty_hours;
  if (totalHours > 24) {
    errors.push({
      field: "off_duty_hours",
      message: "Total hours (driving + off-duty) cannot exceed 24 hours",
    });
  }

  // Status validation
  const validStatuses = [
    "off_duty",
    "sleeper_berth",
    "driving",
    "on_duty_not_driving",
  ];
  if (!data.status || !validStatuses.includes(data.status)) {
    errors.push({ field: "status", message: "Please select a valid status" });
  }

  // Remarks validation (optional but with length limit)
  if (data.remarks && data.remarks.length > 500) {
    errors.push({
      field: "remarks",
      message: "Remarks must be less than 500 characters",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Helper function to get error message for a specific field
export const getFieldError = (
  errors: ValidationError[],
  field: string
): string | undefined => {
  return errors.find((error) => error.field === field)?.message;
};

// Helper function to check if a field has an error
export const hasFieldError = (
  errors: ValidationError[],
  field: string
): boolean => {
  return errors.some((error) => error.field === field);
};
