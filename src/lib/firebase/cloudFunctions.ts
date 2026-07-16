import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";

// Initialize Cloud Functions with regional endpoints fallback ready
export const functions = getFunctions(app);

/**
 * Helper to obtain a strongly-typed callable Cloud Function handler
 */
export function getCallableFunction<TRequest = any, TResponse = any>(name: string) {
  return httpsCallable<TRequest, TResponse>(functions, name);
}

export default functions;
