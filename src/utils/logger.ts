const IS_DEV = process.env.NODE_ENV !== "production";

/**
 * Clean Logger supporting structured logging in Production and readable format in Dev.
 */
export const logger = {
  info: (message: string, ...args: any[]) => {
    if (IS_DEV) {
      console.log(`[INFO] ℹ️ ${message}`, ...args);
    } else {
      console.log(JSON.stringify({ level: "info", message, timestamp: new Date().toISOString(), ...args }));
    }
  },

  warn: (message: string, ...args: any[]) => {
    if (IS_DEV) {
      console.warn(`[WARN] ⚠️ ${message}`, ...args);
    } else {
      console.warn(JSON.stringify({ level: "warn", message, timestamp: new Date().toISOString(), ...args }));
    }
  },

  error: (message: string, error?: any, ...args: any[]) => {
    const errorDetails = error
      ? {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: error.stack,
          originalError: error.originalError,
        }
      : undefined;

    if (IS_DEV) {
      console.error(`[ERROR] 🛑 ${message}`, errorDetails || "", ...args);
    } else {
      console.error(
        JSON.stringify({
          level: "error",
          message,
          error: errorDetails,
          timestamp: new Date().toISOString(),
          ...args,
        })
      );
    }
  },

  upload: (message: string, details?: any) => {
    const timestamp = new Date().toISOString();
    if (IS_DEV) {
      console.log(`[UPLOAD AUDIT] 📤 ${message}`, details || "");
    } else {
      console.log(
        JSON.stringify({
          level: "info",
          category: "upload_audit",
          message,
          details,
          timestamp,
        })
      );
    }
  },
};

export default logger;
