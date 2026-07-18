import { z } from "zod";

/**
 * SnapEvent — Production Zod Validation Schemas
 * All write operations MUST pass through these schemas before touching Firestore.
 * Aligned with src/types/index.ts definitions.
 */

// ────────────────────────────────────────────────────────────
// SHARED / NESTED SCHEMAS
// ────────────────────────────────────────────────────────────

export const CloudinaryAssetSchema = z.object({
  publicId: z.string().min(1, "Cloudinary public ID is required"),
  secureUrl: z.string().url("Invalid Cloudinary secure URL"),
  url: z.string().url("Invalid Cloudinary URL").optional(),
  format: z.string().min(1, "Image format is required").optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  bytes: z.number().int().positive("File size must be greater than 0").optional(),
  version: z.number().int().positive().optional(),
  category: z.string().optional(),
  isFeatured: z.boolean().optional(),
  thumbnailUrl: z.string().optional(),
  uploadedAt: z.string().optional(),
});

export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const AddressSchema = z.object({
  street: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  country: z.string().min(2, "Country is required"),
  postalCode: z.string().optional(),
  geoPoint: GeoPointSchema.optional(),
});

export const PricingPackageSchema = z.object({
  id: z.string().min(1, "Package ID is required"),
  name: z.string().min(2, "Package name is required"),
  description: z.string().min(10, "Package description must be at least 10 characters"),
  price: z.number().positive("Package price must be positive"),
  currency: z.string().length(3, "Currency must be a 3-letter code (e.g. INR, USD)"),
  durationHours: z.number().positive("Duration must be positive"),
  includes: z.array(z.string()).min(1, "Package must include at least one item"),
});

export const SocialLinksSchema = z.object({
  instagram: z.string().url("Invalid Instagram URL").optional().or(z.literal("")),
  facebook: z.string().url("Invalid Facebook URL").optional().or(z.literal("")),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  youtube: z.string().url("Invalid YouTube URL").optional().or(z.literal("")),
  behance: z.string().url("Invalid Behance URL").optional().or(z.literal("")),
});

export const PaymentRecordSchema = z.object({
  status: z.enum(["unpaid", "paid", "refunded", "disputed"]),
  amount: z.number().positive("Payment amount must be positive"),
  currency: z.string().length(3, "Currency must be a 3-letter code"),
  method: z.enum(["razorpay", "stripe", "cash"]).optional(),
  transactionId: z.string().optional(),
});

// ────────────────────────────────────────────────────────────
// 1. USER SCHEMA
// Collection: users
// ────────────────────────────────────────────────────────────

export const UserSchema = z.object({
  uid: z.string().min(1, "UID is required"),
  email: z.string().email("Invalid email address"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  role: z.enum(["customer", "guest"]),
  photoURL: z.string().url("Invalid photo URL").optional(),
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number").optional(),
  address: AddressSchema.optional(),
  isActive: z.boolean().default(true),
  emailVerified: z.boolean().default(false),
  provider: z.enum(["email", "google", "anonymous"]),
});

// ────────────────────────────────────────────────────────────
// 2. PHOTOGRAPHER SCHEMA
// Collection: photographers
// ────────────────────────────────────────────────────────────

export const WeeklyScheduleDaySchema = z.object({
  isOpen: z.boolean(),
  startTime: z.string(),
  endTime: z.string(),
});

export const WeeklyScheduleSchema = z.record(z.string(), WeeklyScheduleDaySchema);

export const PhotographerSchema = z.object({
  // Identity
  uid: z.string().min(1, "UID is required"),
  email: z.string().email("Invalid email address"),
  displayName: z.string().min(2, "Display name is required"),
  role: z.literal("photographer"),

  // Profile
  name: z.string().min(2, "Name must be at least 2 characters"),
  studioName: z.string().min(2, "Studio name must be at least 2 characters"),
  businessName: z.string().optional(),
  tagline: z.string().max(120, "Tagline must be under 120 characters").optional(),
  bio: z.string().optional().default(""),
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  address: AddressSchema,

  // Media
  profileImage: CloudinaryAssetSchema.optional().nullable(),
  coverImage: CloudinaryAssetSchema.optional().nullable(),
  logo: CloudinaryAssetSchema.optional().nullable(),
  portfolioImages: z.array(CloudinaryAssetSchema).max(100, "Maximum 100 portfolio images allowed").default([]),

  // Professional
  specialties: z.array(z.string()).default([]),
  experience: z.number().int().min(0, "Experience cannot be negative").default(0),
  languages: z.array(z.string()).default([]),
  equipment: z.array(z.string()).default([]),
  photographyStyle: z.string().optional(),
  pricingPackages: z.array(PricingPackageSchema).default([]),
  startingPrice: z.number().nonnegative("Starting price cannot be negative").default(0),
  currency: z.string().length(3, "Currency must be a 3-letter code").default("INR"),

  // Availability
  weeklySchedule: WeeklyScheduleSchema.optional(),
  vacationMode: z.boolean().default(false),
  unavailableDates: z.array(z.string()).default([]),
  timezone: z.string().default("Asia/Kolkata"),

  // Social
  socialLinks: SocialLinksSchema.optional(),

  // Platform & Stats
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isSuspended: z.boolean().default(false),
  profileCompletion: z.number().min(0).max(100).optional(),
  blocked: z.boolean().default(false),
  isVerified: z.boolean().default(false),
  status: z.string().default("active"),
  profileCompleted: z.boolean().default(true),
  onboardingCompleted: z.boolean().default(true),
  profilePhoto: z.string().min(1, "Profile photo is required"),
  coverPhoto: z.string().default(""),
  rating: z.number().default(0),
  ratingCount: z.number().default(0),
});

/**
 * Relaxed schema used only during initial photographer signup.
 * Bio, pricing packages, and profile image are optional at signup —
 * the photographer completes them later from their dashboard.
 */
export const PhotographerSignupSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(2),
  role: z.literal("photographer"),
  name: z.string().min(2),
  studioName: z.string().min(2),
  bio: z.string().optional().default(""),
  phone: z.string().optional(),
  address: AddressSchema,
  profileImage: CloudinaryAssetSchema.optional().nullable(),
  coverImage: CloudinaryAssetSchema.optional().nullable(),
  portfolioImages: z.array(CloudinaryAssetSchema).default([]),
  specialties: z.array(z.string()).min(1),
  experience: z.number().int().min(0),
  languages: z.array(z.string()).min(1),
  pricingPackages: z.array(PricingPackageSchema).default([]),
  startingPrice: z.number().positive(),
  currency: z.string().length(3),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isSuspended: z.boolean().default(false),
  timezone: z.string().default("Asia/Kolkata"),
  blocked: z.boolean().default(false),
  isVerified: z.boolean().default(false),
  status: z.string().default("active"),
  profileCompleted: z.boolean().default(true),
  onboardingCompleted: z.boolean().default(true),
  profilePhoto: z.string().min(1, "Profile photo is required"),
  coverPhoto: z.string().default(""),
  rating: z.number().default(0),
  ratingCount: z.number().default(0),
});

export type ValidatedPhotographerSignup = z.infer<typeof PhotographerSignupSchema>;



// ────────────────────────────────────────────────────────────
// 3. VIRTUAL ROOM SCHEMA
// Collection: virtual_rooms
// ────────────────────────────────────────────────────────────

export const RoomSchema = z.object({
  photographerId: z.string().min(1, "Photographer ID is required"),
  photographerName: z.string().min(1, "Photographer name is required"),
  name: z.string().min(3, "Room name must be at least 3 characters"),
  description: z.string().max(500).optional(),
  eventType: z.string().min(2, "Event type is required"),
  eventDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid event date format",
  }),
  eventLocation: AddressSchema.optional(),
  bookingId: z.string().optional(),
  allowGuestUpload: z.boolean().default(false),
  requireApprovalForDownload: z.boolean().default(true),
  watermarkPhotos: z.boolean().default(true),
  accessCode: z.string().min(4).max(20).optional(),
});

// ────────────────────────────────────────────────────────────
// 4. BOOKING SCHEMA
// Collection: bookings
// ────────────────────────────────────────────────────────────

export const BookingSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid customer email"),
  customerPhone: z.string().regex(/^\+?[1-9]\d{6,14}$/).optional(),
  photographerId: z.string().min(1, "Photographer ID is required"),
  photographerName: z.string().min(1, "Photographer name is required"),
  photographerEmail: z.string().email("Invalid photographer email"),
  eventType: z.string().min(2, "Event type is required"),
  eventDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid event date",
  }),
  eventLocation: AddressSchema,
  durationHours: z.number().positive("Duration must be positive"),
  packageId: z.string().optional(),
  packageName: z.string().optional(),
  price: z.number().positive("Price must be greater than 0"),
  currency: z.string().length(3, "Currency must be a 3-letter code"),
  payment: PaymentRecordSchema,
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
});

// ────────────────────────────────────────────────────────────
// 5. PHOTO SCHEMA
// Collection: photos
// ────────────────────────────────────────────────────────────

export const PhotoSchema = z.object({
  roomId: z.string().min(1, "Room ID is required"),
  photographerId: z.string().min(1, "Photographer ID is required"),
  uploadedBy: z.string().min(1, "Uploader ID is required"),
  asset: CloudinaryAssetSchema,
  thumbnailUrl: z.string().url("Invalid thumbnail URL"),
  originalFilename: z.string().min(1, "Original filename is required"),
  tags: z.array(z.string()).default([]),
  isWatermarked: z.boolean().default(false),
});

// ────────────────────────────────────────────────────────────
// 6. REVIEW SCHEMA
// Collection: reviews
// ────────────────────────────────────────────────────────────

export const ReviewSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  photographerId: z.string().min(1, "Photographer ID is required"),
  customerId: z.string().min(1, "Customer ID is required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhotoURL: z.string().url().optional(),
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().min(10, "Comment must be at least 10 characters").max(1000),
  images: z.array(CloudinaryAssetSchema).max(5, "Maximum 5 review images").optional(),
});

// ────────────────────────────────────────────────────────────
// 7. NOTIFICATION SCHEMA
// Collection: notifications
// ────────────────────────────────────────────────────────────

export const NotificationSchema = z.object({
  recipientId: z.string().optional(),
  recipientRole: z.enum(["admin", "photographer", "customer", "guest"]).optional(),
  receiverId: z.string().optional(),
  receiverRole: z.enum(["admin", "photographer", "customer", "guest"]).optional(),
  senderId: z.string().optional(),
  senderRole: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  type: z.enum([
    "booking_created",
    "booking_confirmed",
    "booking_cancelled",
    "booking_completed",
    "room_created",
    "room_closed",
    "photo_uploaded",
    "download_requested",
    "download_approved",
    "download_rejected",
    "review_received",
    "general",
    "system_announcement",
    "booking_notification",
    "event_reminder",
    "maintenance_notice",
    "custom_message",
    "info",
    "success",
    "warning",
    "error",
  ]),
  title: z.string().min(2, "Notification title is required"),
  message: z.string().min(5, "Notification message body is required"),
  imageUrl: z.string().url().optional(),
  actionUrl: z.string().optional(),
  actionLabel: z.string().optional(),
  relatedId: z.string().optional(),
  relatedType: z.enum(["booking", "room", "photo", "review", "download"]).optional(),
});

// ────────────────────────────────────────────────────────────
// 8. DOWNLOAD REQUEST SCHEMA
// Collection: download_requests
// ────────────────────────────────────────────────────────────

export const DownloadRequestSchema = z.object({
  roomId: z.string().min(1, "Room ID is required"),
  photographerId: z.string().min(1, "Photographer ID is required"),
  customerId: z.string().min(1, "Guest ID is required"),
  customerName: z.string().min(1, "Guest name is required"),
  customerPhone: z.string().regex(/^\+?[1-9]\d{6,14}$/, "Please enter a valid mobile number"),
  customerEmail: z.string().email("Invalid guest email").optional().or(z.literal("")),
  specialMessage: z.string().max(500, "Message cannot exceed 500 characters").optional(),
  selfiePublicId: z.string().optional(),
  requestedPhotoIds: z.array(z.string()).min(1, "Select at least one photo to request"),
});

// ────────────────────────────────────────────────────────────
// 9. ADMIN SCHEMA
// Collection: admins
// ────────────────────────────────────────────────────────────

export const AdminSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(2),
  role: z.literal("admin"),
  permissions: z.array(
    z.enum([
      "manage_users",
      "manage_photographers",
      "manage_bookings",
      "manage_rooms",
      "manage_reviews",
      "manage_downloads",
      "view_analytics",
      "manage_settings",
      "view_audit_logs",
    ])
  ),
  isSuperAdmin: z.boolean().default(false),
});

// ────────────────────────────────────────────────────────────
// 10. PLATFORM SETTINGS SCHEMA
// Collection: settings (documentId = "platform")
// ────────────────────────────────────────────────────────────

export const PlatformSettingsSchema = z.object({
  appName: z.string().min(2),
  tagline: z.string().max(120),
  supportEmail: z.string().email(),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().optional(),
  maxPhotosPerRoom: z.number().int().positive(),
  maxRoomsPerPhotographer: z.number().int().positive(),
  maxPortfolioImages: z.number().int().positive(),
  downloadLinkExpiryHours: z.number().int().positive(),
  platformCommissionPercent: z.number().min(0).max(100),
  cloudinaryFolder: z.string().min(1),
});

// ────────────────────────────────────────────────────────────
// TYPE EXPORTS (inferred from schemas)
// ────────────────────────────────────────────────────────────

export type ValidatedUser = z.infer<typeof UserSchema>;
export type ValidatedPhotographer = z.infer<typeof PhotographerSchema>;
export type ValidatedRoom = z.infer<typeof RoomSchema>;
export type ValidatedBooking = z.infer<typeof BookingSchema>;
export type ValidatedPhoto = z.infer<typeof PhotoSchema>;
export type ValidatedReview = z.infer<typeof ReviewSchema>;
export type ValidatedNotification = z.infer<typeof NotificationSchema>;
export type ValidatedDownloadRequest = z.infer<typeof DownloadRequestSchema>;
export type ValidatedAdmin = z.infer<typeof AdminSchema>;
export type ValidatedPlatformSettings = z.infer<typeof PlatformSettingsSchema>;
export type ValidatedCloudinaryAsset = z.infer<typeof CloudinaryAssetSchema>;
export type ValidatedAddress = z.infer<typeof AddressSchema>;
export type ValidatedPricingPackage = z.infer<typeof PricingPackageSchema>;
export type ValidatedPaymentRecord = z.infer<typeof PaymentRecordSchema>;
