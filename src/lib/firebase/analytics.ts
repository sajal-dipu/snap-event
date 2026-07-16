import { getAnalytics, isSupported, Analytics } from "firebase/analytics";
import { app } from "./firebase";
import { logger } from "@/utils/logger";

let analytics: Analytics | null = null;

if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
        logger.info("Firebase Analytics initialized successfully");
      } else {
        logger.warn("Firebase Analytics is not supported in this environment");
      }
    })
    .catch((error) => {
      logger.error("Error checking if Firebase Analytics is supported:", error);
    });
}

export { analytics };
export default analytics;
