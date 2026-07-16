import { AppError } from "./AppError";

/**
 * Normalizes Firebase Authentication and Firestore errors into structured AppErrors.
 */
export function handleFirebaseError(error: any): AppError {
  if (error instanceof AppError) return error;

  const code = error?.code || "firebase/unknown-error";
  const message = error?.message || "An unexpected database or authentication error occurred.";
  
  // Map common Firebase errors to HTTP status codes and user-friendly messages
  if (code === "failed-precondition" || String(message).toLowerCase().includes("index")) {
    console.warn(
      `%c[SnapEvent Database Warning] Missing composite index detected!\n` +
      `Please check the Firestore console and create the required composite index.\n` +
      `Details: ${message}`,
      "color: #a855f7; font-weight: bold; font-size: 12px; padding: 4px;"
    );
  }

  switch (code) {
    // Auth errors
    case "auth/email-already-in-use":
      return new AppError("This email address is already registered.", code, 400, error);
    case "auth/invalid-email":
      return new AppError("The email address format is invalid.", code, 400, error);
    case "auth/weak-password":
      return new AppError("The password must be at least 6 characters.", code, 400, error);
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return new AppError("Invalid login credentials provided.", "auth/invalid-login", 401, error);
    case "auth/user-disabled":
      return new AppError("This user account has been disabled.", code, 403, error);
    case "auth/operation-not-allowed":
      return new AppError("This registration style is not enabled.", code, 400, error);
    case "auth/too-many-requests":
      return new AppError("Too many login attempts. Please try again later.", code, 429, error);

    // Firestore errors
    case "permission-denied":
      return new AppError("You do not have permission to perform this database action.", "firestore/permission-denied", 403, error);
    case "unavailable":
      return new AppError("The database service is temporarily offline. Please retry.", "firestore/unavailable", 503, error);
    case "not-found":
      return new AppError("The requested database record does not exist.", "firestore/not-found", 404, error);
    case "already-exists":
      return new AppError("This document record already exists.", "firestore/already-exists", 409, error);
    case "failed-precondition":
      return new AppError("A required database index is missing or disabled.", "firestore/failed-precondition", 400, error);

    default:
      return new AppError(message, code, 500, error);
  }
}

/**
 * Normalizes Cloudinary file management and upload failures into structured AppErrors.
 */
export function handleCloudinaryError(error: any): AppError {
  if (error instanceof AppError) return error;

  const message = error?.message || error?.error?.message || "An unexpected file cloud management error occurred.";
  const code = error?.http_code ? `cloudinary/${error.http_code}` : "cloudinary/upload-failed";
  const status = error?.http_code || 500;

  return new AppError(message, code, status, error);
}
