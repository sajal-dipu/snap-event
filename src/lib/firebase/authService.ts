import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  browserSessionPersistence,
  browserLocalPersistence,
  setPersistence,
  type User,
  type UserCredential,
} from "firebase/auth";
import { auth } from "./auth";
import { logger } from "@/utils/logger";
import { APP_URL } from "@/utils/helpers";


// ────────────────────────────────────────────────────────────
// FIREBASE AUTH ERROR CODE → USER-FRIENDLY MESSAGES
// ────────────────────────────────────────────────────────────

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-email": "The email address is invalid.",
  "auth/user-disabled": "This account has been disabled. Please contact support.",
  "auth/user-not-found": "No account found with this email. Please check and try again.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/invalid-credential": "Incorrect email or password. Please try again.",
  "auth/email-already-in-use": "An account with this email already exists. Please log in instead.",
  "auth/weak-password": "Password is too weak. Please use a stronger password.",
  "auth/too-many-requests": "Too many failed attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Network error. Please check your internet connection.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/requires-recent-login": "Please log in again to perform this action.",
  "auth/email-not-verified": "Please verify your email before continuing.",
  "auth/operation-not-allowed": "Email/password authentication is not enabled.",
  "auth/expired-action-code": "This link has expired. Please request a new one.",
  "auth/invalid-action-code": "This link is invalid or has already been used.",
  "auth/missing-email": "Please provide an email address.",
};

export function getAuthErrorMessage(code: string): string {
  return AUTH_ERROR_MESSAGES[code] ?? "An unexpected error occurred. Please try again.";
}

export function parseFirebaseAuthError(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return getAuthErrorMessage((error as { code: string }).code);
  }
  return "An unexpected error occurred. Please try again.";
}

// ────────────────────────────────────────────────────────────
// AUTH OPERATIONS
// ────────────────────────────────────────────────────────────

/**
 * Register a new user with email and password.
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  try {
    logger.info(`Signing up new user: ${email}`);
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    return credential;
  } catch (error) {
    logger.error("Sign-up failed:", error);
    throw error;
  }
}

/**
 * Sign in with email and password.
 * @param rememberMe — true = browserLocalPersistence; false = browserSessionPersistence
 */
export async function signInWithEmail(
  email: string,
  password: string,
  rememberMe = false
): Promise<UserCredential> {
  try {
    logger.info(`Signing in user: ${email} [rememberMe=${rememberMe}]`);
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    logger.error("Sign-in failed:", error);
    throw error;
  }
}

/**
 * Send email verification to the currently logged-in user.
 */
export async function sendVerificationEmail(user: User): Promise<void> {
  try {
    const actionCodeSettings = {
      url: `${APP_URL}/login?verified=1`,
      handleCodeInApp: false,
    };
    await sendEmailVerification(user, actionCodeSettings);
    logger.info(`Verification email sent to: ${user.email}`);
  } catch (error) {
    logger.error("Failed to send verification email:", error);
    throw error;
  }
}

/**
 * Send a password reset email.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    const actionCodeSettings = {
      url: `${APP_URL}/login`,
      handleCodeInApp: false,
    };
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
    logger.info(`Password reset email sent to: ${email}`);
  } catch (error) {
    logger.error("Failed to send password reset email:", error);
    throw error;
  }
}

/**
 * Sign out the current user and clear session cookies.
 */
export async function firebaseSignOut(): Promise<void> {
  try {
    await signOut(auth);
    // Clear role cookie used by middleware
    document.cookie =
      "snapEvent-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    logger.info("User signed out successfully");
  } catch (error) {
    logger.error("Sign-out failed:", error);
    throw error;
  }
}

export function setRoleCookie(role: string): void {
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  document.cookie = `snapEvent-role=${role}; path=/; max-age=${maxAge}; SameSite=Lax`;
}
