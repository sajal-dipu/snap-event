import { z } from "zod";

// ────────────────────────────────────────────────────────────
// SHARED VALIDATORS
// ────────────────────────────────────────────────────────────

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const phoneRegex = /^\+?[1-9]\d{6,14}$/;

export const PHOTOGRAPHY_SPECIALTIES = [
  "Wedding",
  "Pre-Wedding",
  "Fashion",
  "Portrait",
  "Wildlife",
  "Corporate",
  "Birthday",
  "Baby Shoot",
  "Drone",
  "Commercial",
  "Food",
  "Product",
  "Travel",
  "Real Estate",
  "Events",
  "Others",
] as const;

export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"] as const;

export const LANGUAGES = [
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Bengali",
  "Marathi",
  "Gujarati",
  "Punjabi",
  "Urdu",
  "Arabic",
  "French",
  "Spanish",
  "German",
] as const;

// ────────────────────────────────────────────────────────────
// PHOTOGRAPHER LOGIN
// ────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

export type LoginFormData = z.infer<typeof LoginSchema>;

// ────────────────────────────────────────────────────────────
// ADMIN LOGIN
// ────────────────────────────────────────────────────────────

export const AdminLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type AdminLoginFormData = z.infer<typeof AdminLoginSchema>;

// ────────────────────────────────────────────────────────────
// FORGOT PASSWORD
// ────────────────────────────────────────────────────────────

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>;

// ────────────────────────────────────────────────────────────
// SIGNUP — STEP 1: Personal Information
// ────────────────────────────────────────────────────────────

export const SignUpStep1Schema = z
  .object({
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(60, "Full name is too long"),
    email: z.string().email("Please enter a valid email address"),
    phone: z
      .string()
      .regex(phoneRegex, "Please enter a valid phone number (include country code)")
      .optional()
      .or(z.literal("")),
    password: strongPassword,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpStep1Data = z.infer<typeof SignUpStep1Schema>;

// ────────────────────────────────────────────────────────────
// SIGNUP — STEP 2: Studio Information
// ────────────────────────────────────────────────────────────

export const SignUpStep2Schema = z.object({
  studioName: z
    .string()
    .min(2, "Studio name must be at least 2 characters")
    .max(80, "Studio name is too long"),
  experience: z
    .number({ message: "Experience must be a number" })
    .min(0, "Experience cannot be negative")
    .max(60, "Please enter a valid experience"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  country: z.string().min(2, "Country is required"),
});

export type SignUpStep2Data = z.infer<typeof SignUpStep2Schema>;

// ────────────────────────────────────────────────────────────
// SIGNUP — STEP 3: Photography Specialties
// ────────────────────────────────────────────────────────────

export const SignUpStep3Schema = z.object({
  specialties: z
    .array(z.string())
    .min(1, "Please select at least one photography specialty"),
});

export type SignUpStep3Data = z.infer<typeof SignUpStep3Schema>;

// ────────────────────────────────────────────────────────────
// SIGNUP — STEP 4: Pricing & Languages
// ────────────────────────────────────────────────────────────

export const SignUpStep4Schema = z.object({
  startingPrice: z
    .number({ message: "Starting price must be a number" })
    .positive("Starting price must be greater than 0"),
  currency: z.enum(CURRENCIES, { message: "Please select a valid currency" }),
  languages: z
    .array(z.string())
    .min(1, "Please select at least one language"),
});

export type SignUpStep4Data = z.infer<typeof SignUpStep4Schema>;

// ────────────────────────────────────────────────────────────
// SIGNUP — STEP 5: Profile Images (client-side validation only)
// ────────────────────────────────────────────────────────────

export const SignUpStep5Schema = z.object({
  profileImageFile: z
    .instanceof(typeof window !== "undefined" ? File : Object)
    .refine(
      (f) => f instanceof File && f.size <= 5 * 1024 * 1024,
      "Profile photo must be less than 5MB"
    )
    .refine(
      (f) => f instanceof File && ["image/jpeg", "image/png", "image/webp"].includes(f.type),
      "Please upload a JPEG, PNG, or WebP image"
    )
    .optional(),
  coverImageFile: z
    .instanceof(typeof window !== "undefined" ? File : Object)
    .refine(
      (f) => f instanceof File && f.size <= 10 * 1024 * 1024,
      "Cover image must be less than 10MB"
    )
    .optional(),
});

export type SignUpStep5Data = z.infer<typeof SignUpStep5Schema>;

// ────────────────────────────────────────────────────────────
// COMPLETE SIGNUP DATA (aggregated from all steps)
// ────────────────────────────────────────────────────────────

export interface CompleteSignUpData {
  step1: SignUpStep1Data;
  step2: SignUpStep2Data;
  step3: SignUpStep3Data;
  step4: SignUpStep4Data;
  step5: {
    profileImageFile?: File;
    coverImageFile?: File;
  };
}
