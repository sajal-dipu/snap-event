import { z } from "zod";
import { logger } from "@/utils/logger";

const firebaseEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL").optional().or(z.literal("")),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, "NEXT_PUBLIC_FIREBASE_API_KEY is required"),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is required"),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, "NEXT_PUBLIC_FIREBASE_PROJECT_ID is required"),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1, "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is required"),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is required"),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, "NEXT_PUBLIC_FIREBASE_APP_ID is required"),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().min(1, "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID is required"),
});

const cloudinaryEnvSchema = z.object({
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1, "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is required"),
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: z.string().min(1, "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required").optional(),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required").optional(),
});

export function validateFirebaseEnv() {
  const result = firebaseEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  });

  if (!result.success) {
    logger.error("Firebase Environment validation failed:", result.error.format());
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid Firebase environment configuration. Check your environment variables.");
    }
  }
}

export function validateCloudinaryEnv() {
  const isServer = typeof window === "undefined";
  
  const result = cloudinaryEnvSchema.safeParse({
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  });

  if (!result.success) {
    logger.error("Cloudinary Environment validation failed:", result.error.format());
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid Cloudinary environment configuration. Check your environment variables.");
    }
    return;
  }

  // Enforce server secrets strictly on the server side
  if (isServer) {
    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      logger.error("Server-side Cloudinary validation failed: Missing API Key or Secret");
      if (process.env.NODE_ENV === "production") {
        throw new Error("Missing server-side Cloudinary credentials");
      }
    }
  }
}
