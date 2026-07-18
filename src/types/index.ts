import { Timestamp } from "firebase/firestore";

// ============================================================
// SnapEvent — Complete Firestore Database Type Definitions
// Version: 1.0.0
// All timestamps are Firebase Timestamp for server consistency.
// All IDs are Firestore document IDs (string).
// ============================================================

// ────────────────────────────────────────────────────────────
// ENUMS & SHARED LITERALS
// ────────────────────────────────────────────────────────────

export type UserRole = "admin" | "photographer" | "user" | "customer" | "guest";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "refunded"
  | "accepted"
  | "rejected";

export type RoomStatus = "active" | "closed" | "archived" | "upcoming" | "live" | "completed" | "paused";

export type PhotoStatus = "processing" | "ready" | "failed" | "deleted";

export type DownloadRequestStatus = "pending" | "approved" | "rejected" | "expired";

export type NotificationType =
  | "booking_created"
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_completed"
  | "room_created"
  | "room_closed"
  | "photo_uploaded"
  | "download_requested"
  | "download_approved"
  | "download_rejected"
  | "review_received"
  | "general"
  | "system_announcement"
  | "booking_notification"
  | "event_reminder"
  | "maintenance_notice"
  | "custom_message"
  | "info"
  | "success"
  | "warning"
  | "error";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export type PaymentStatus = "unpaid" | "paid" | "refunded" | "disputed";

export type AuditAction =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "photographer.verified"
  | "photographer.suspended"
  | "booking.created"
  | "booking.confirmed"
  | "booking.cancelled"
  | "room.created"
  | "room.closed"
  | "photo.uploaded"
  | "photo.deleted"
  | "download.approved"
  | "download.rejected"
  | "review.deleted"
  | "admin.login";

// ────────────────────────────────────────────────────────────
// NESTED / SHARED INTERFACES
// ────────────────────────────────────────────────────────────

/** Cloudinary asset reference stored on all media fields */
export interface CloudinaryAsset {
  publicId: string;          // e.g. snapevent/photographers/abc123
  secureUrl: string;         // HTTPS CDN URL
  url?: string;              // Delivery URL (CDN)
  format?: string;           // jpg | png | webp
  width?: number;
  height?: number;
  bytes?: number;
  version?: number;
  category?: string;         // Optional category for portfolio grouping
  isFeatured?: boolean;      // Featured portfolio status
  thumbnailUrl?: string;     // Thumbnail image URL
  uploadedAt?: string;       // ISO upload date string
}

/** GPS coordinates for event location */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Structured address for photographers and bookings */
export interface Address {
  street?: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  geoPoint?: GeoPoint;
}

/** Pricing tier for photographers */
export interface PricingPackage {
  id: string;
  name: string;              // e.g. "Wedding Basic"
  description: string;
  price: number;             // INR or base currency
  currency: string;          // "INR" | "USD"
  durationHours: number;
  includes: string[];        // ["50 edited photos", "1 location"]
}

/** Social media links for photographers */
export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  website?: string;
  youtube?: string;
  behance?: string;
}

/** Photographer availability slot */
export interface AvailabilitySlot {
  date: string;              // ISO date string YYYY-MM-DD
  isBlocked: boolean;
  reason?: string;           // "booked" | "personal"
}

/** Face recognition metadata stored per photo */
export interface FaceData {
  faceId: string;            // External face recognition ID
  confidence: number;        // 0.0 – 1.0
  boundingBox?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

/** QR code metadata for virtual rooms */
export interface QRCodeData {
  code: string;              // Unique short code (6-8 chars)
  url: string;               // Full scanned URL
  imageUrl: string;          // Cloudinary QR image delivery URL
  publicId: string;          // Cloudinary public ID of QR image
  generatedAt: Timestamp;
}

/** Aggregated rating stats (denormalized for performance) */
export interface RatingStats {
  average: number;           // 1.0 – 5.0
  count: number;
  distribution: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
  };
}

/** Payment record embedded in bookings */
export interface PaymentRecord {
  status: PaymentStatus;
  amount: number;
  currency: string;
  method?: string;           // "razorpay" | "stripe" | "cash"
  transactionId?: string;
  paidAt?: Timestamp;
  refundedAt?: Timestamp;
}

// ────────────────────────────────────────────────────────────
// COLLECTION 1: admins
// Path: /admins/{adminId}
// Document ID = Firebase Auth UID
// ────────────────────────────────────────────────────────────

export interface Admin {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: "admin";
  permissions: AdminPermission[];
  isSuperAdmin: boolean;
  lastLoginAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AdminPermission =
  | "manage_users"
  | "manage_photographers"
  | "manage_bookings"
  | "manage_rooms"
  | "manage_reviews"
  | "manage_downloads"
  | "view_analytics"
  | "manage_settings"
  | "view_audit_logs";

// ────────────────────────────────────────────────────────────
// COLLECTION 2: photographers
// Path: /photographers/{photographerId}
// Document ID = Firebase Auth UID
// ────────────────────────────────────────────────────────────

export interface WeeklyScheduleDay {
  isOpen: boolean;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "18:00"
}

export type WeeklySchedule = Record<string, WeeklyScheduleDay>;

export interface Photographer {
  // Identity
  uid: string;
  email: string;
  displayName: string;
  role: "photographer";

  // Profile/Marketplace System Fields
  isPublished?: boolean;
  specializations?: string[];
  portfolio?: any[];
  packages?: any[];
  location?: string;
  whatsappNumber?: string;
  contactEmail?: string;

  // Profile
  name: string;
  studioName: string;
  slug?: string;
  marketplacePublished?: boolean;
  businessName?: string;
  tagline?: string;
  bio: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  address: Address;

  // Media
  profileImage?: CloudinaryAsset | null;
  coverImage?: CloudinaryAsset | null;
  logo?: CloudinaryAsset | null;
  portfolioImages: CloudinaryAsset[];

  // Professional
  specialties: string[];            // ["wedding", "portrait", "event"]
  experience: number;               // Years
  languages: string[];              // ["English", "Hindi"]
  equipment?: string[];             // ["Canon R5", "Sony A7"]
  photographyStyle?: string;
  pricingPackages: PricingPackage[];
  startingPrice: number;            // Lowest package price (denormalized)
  currency: string;

  // Availability
  availability: AvailabilitySlot[]; // Specific blocked dates / custom slots
  weeklySchedule?: WeeklySchedule;  // Standard hours per day
  vacationMode?: boolean;
  unavailableDates?: string[];       // Array of blocked dates (YYYY-MM-DD)
  timezone: string;                 // "Asia/Kolkata"

  // Social
  socialLinks: SocialLinks;

  // Stats (denormalized)
  ratingStats: RatingStats;
  totalBookings: number;
  completedBookings: number;
  totalRooms: number;
  totalPhotosUploaded: number;

  // Verification & Completion
  verificationStatus: VerificationStatus;
  verifiedAt?: Timestamp;
  verifiedBy?: string;              // Admin UID
  profileCompletion?: number;       // Profile completion percentage (0 - 100)
  blocked: boolean;
  isVerified: boolean;
  status: string;
  profileCompleted: boolean;
  onboardingCompleted: boolean;
  profilePhoto: string;
  coverPhoto: string;
  rating: number;
  ratingCount: number;

  // Platform
  isActive: boolean;
  isFeatured: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  fcmToken?: string;               // For push notifications

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ────────────────────────────────────────────────────────────
// COLLECTION 3: users
// Path: /users/{userId}
// Document ID = Firebase Auth UID
// ────────────────────────────────────────────────────────────

export interface User {
  // Identity
  uid: string;
  email: string;
  displayName: string;
  role: "user" | "customer" | "guest";
  photoURL?: string;
  phone?: string;

  // Profile
  address?: Address;

  // Stats (denormalized)
  totalBookings: number;
  totalDownloadRequests: number;

  // Platform
  isActive: boolean;
  emailVerified: boolean;
  fcmToken?: string;

  // Auth provider
  provider: "email" | "google" | "anonymous";

  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
}

// ────────────────────────────────────────────────────────────
// COLLECTION 4: virtual_rooms
// Path: /virtual_rooms/{roomId}
// ────────────────────────────────────────────────────────────

export interface VirtualRoom {
  id: string;
  photographerId: string;           // Ref → photographers
  photographerName: string;         // Denormalized

  // Event Info
  name: string;                     // "Sharma Wedding 2025"
  description?: string;
  eventType: string;                // "wedding" | "birthday" | "corporate"
  eventDate: Timestamp;
  eventTime?: string;
  eventLocation?: Address;
  bookingId?: string;               // Ref → bookings (optional)
  coverImage?: string;              // Optional cover image URL

  // QR / Access
  qrCode: QRCodeData;
  accessCode?: string;              // Optional password for room access
  passwordHash?: string;
  passwordCreatedAt?: Timestamp;
  passwordVersion?: number;
  securityCode?: string;


  // Settings
  allowGuestUpload: boolean;
  requireApprovalForDownload: boolean;
  watermarkPhotos: boolean;
  autoCloseAt?: Timestamp;
  visibility?: "public" | "private";
  allowGuestAccess?: boolean;
  requireFaceVerification?: boolean;
  allowDownloadRequests?: boolean;
  autoCloseRoom?: boolean;
  autoCloseDate?: Timestamp;
  albums?: string[];

  // Stats (denormalized)
  photoCount: number;
  guestCount: number;
  downloadRequestCount: number;
  approvedDownloadCount: number;
  qrScans?: number;
  galleryViews?: number;
  rejectedDownloadCount?: number;
  averageVisitDuration?: number;
  dailyVisitors?: Record<string, number>;

  // Status
  status: RoomStatus;
  closedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ────────────────────────────────────────────────────────────
// COLLECTION 5: photos
// Path: /photos/{photoId}
// ────────────────────────────────────────────────────────────

export interface Photo {
  id: string;
  roomId: string;                   // Ref → virtual_rooms
  photographerId: string;           // Ref → photographers
  uploadedBy: string;               // Auth UID (photographer or guest)

  // Cloudinary
  asset: CloudinaryAsset;
  thumbnailUrl: string;             // Pre-generated CDN thumbnail URL
  originalFilename: string;

  // AI Face Recognition
  faces: FaceData[];
  faceCount: number;
  isProcessed: boolean;             // Has AI scan completed?
  processingError?: string;

  // Metadata
  takenAt?: Timestamp;              // EXIF date if available
  gpsLocation?: GeoPoint;          // EXIF GPS if available
  tags: string[];                   // Manual or AI-generated tags

  // Status
  status: PhotoStatus;
  isWatermarked: boolean;
  isDeleted: boolean;
  deletedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ────────────────────────────────────────────────────────────
// COLLECTION 6: bookings
// Path: /bookings/{bookingId}
// ────────────────────────────────────────────────────────────

export interface Booking {
  id: string;

  // Parties (denormalized for query performance)
  customerId: string;               // Ref → users
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  bookingStatus?: BookingStatus;

  photographerId: string;           // Ref → photographers
  photographerName: string;
  photographerEmail: string;

  // Event Details
  eventName?: string;
  eventType: string;
  eventDate: Timestamp;
  eventTime?: string;
  endTime?: string;
  eventLocation: Address;
  durationHours: number;
  packageId?: string;               // Ref → pricingPackages[].id
  packageName?: string;
  guestCount?: number;

  // Pricing
  price: number;
  currency: string;
  payment: PaymentRecord;

  // Communication
  notes?: string;                   // Customer instructions
  photographerNotes?: string;       // Photographer internal note
  cancellationReason?: string;

  // Linked room
  roomId?: string;                  // Ref → virtual_rooms (set on confirmation)

  // Status
  status: BookingStatus;
  confirmedAt?: Timestamp;
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;

  // Review
  hasReview: boolean;               // Denormalized flag
  isArchived?: boolean;             // Archive flag

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ────────────────────────────────────────────────────────────
// COLLECTION 7: reviews
// Path: /reviews/{reviewId}
// ────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  bookingId: string;                // Ref → bookings
  photographerId: string;           // Ref → photographers
  customerId: string;               // Ref → users
  customerName: string;             // Denormalized
  customerPhotoURL?: string;        // Denormalized

  // Content
  rating: number;                   // 1 – 5
  comment: string;
  images?: CloudinaryAsset[];       // Optional review photos

  // Moderation
  isVerified: boolean;              // Admin verified review
  isHidden: boolean;               // Admin can hide abusive reviews
  hiddenReason?: string;
  reportCount: number;

  // Photographer Response
  reply?: string;
  repliedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ────────────────────────────────────────────────────────────
// COLLECTION 8: download_requests
// Path: /download_requests/{requestId}
// ────────────────────────────────────────────────────────────

export interface DownloadRequest {
  id: string;
  roomId: string;                   // Ref → virtual_rooms
  photographerId: string;           // Ref → photographers
  customerId: string;               // Ref → users (guest or registered)
  customerName: string;             // Denormalized
  customerPhone: string;            // Guest mobile number
  customerEmail?: string;           // Optional email
  specialMessage?: string;          // Optional guest message
  selfiePublicId?: string;          // Cloudinary selfie for face match
  guestUid?: string;
  guestName?: string;
  email?: string;
  phone?: string;

  // Requested photos
  requestedPhotoIds: string[];      // Array of photo IDs
  requestedPhotos?: string[];
  approvedPhotoIds: string[];       // Subset approved by photographer
  rejectedPhotoIds: string[];       // Subset rejected

  // Face match results
  matchedPhotoIds: string[];        // AI face-match results
  matchConfidence: number;          // Average confidence 0.0–1.0

  // Download link
  downloadUrl?: string;             // Signed Cloudinary zip URL
  downloadExpiresAt?: Timestamp;
  downloadToken?: string;           // Secure unique token for URL resolution
  downloadCount?: number;           // Total downloads tracked
  internalNotes?: string;           // Photographer-only notes

  // Status
  status: DownloadRequestStatus;
  reviewedAt?: Timestamp;
  reviewedBy?: string;              // Photographer UID
  rejectionReason?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ────────────────────────────────────────────────────────────
// COLLECTION 9: notifications
// Path: /notifications/{notificationId}
// ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  recipientId: string;              // Target user UID (backward compatibility)
  recipientRole: UserRole;          // (backward compatibility)
  
  // New spec fields
  receiverId?: string;              // Target user UID
  receiverRole?: UserRole;
  senderId?: string;
  senderRole?: string;
  priority?: "low" | "medium" | "high";

  // Content
  type: NotificationType;
  title: string;
  message: string;
  imageUrl?: string;

  // Deep link
  actionUrl?: string;              // In-app route (e.g. /bookings/abc123)
  actionLabel?: string;            // "View Booking"

  // Related entities
  relatedId?: string;              // Booking / Room / Photo ID
  relatedType?: "booking" | "room" | "photo" | "review" | "download";

  // State
  isRead: boolean;
  readAt?: Timestamp;
  isSent?: boolean;                 // Was FCM push sent?

  createdAt: Timestamp;
}

// ────────────────────────────────────────────────────────────
// COLLECTION 10: analytics
// Path: /analytics/{documentId}
// documentId = "platform_daily_YYYY-MM-DD" | "photographer_{id}_monthly_YYYY-MM"
// ────────────────────────────────────────────────────────────

export interface PlatformDailyAnalytics {
  id: string;
  type: "platform_daily";
  date: string;                     // "YYYY-MM-DD"

  // Traffic
  newUsers: number;
  newPhotographers: number;
  activeUsers: number;

  // Transactions
  bookingsCreated: number;
  bookingsCompleted: number;
  bookingsCancelled: number;
  revenueTotal: number;
  currency: string;

  // Content
  roomsCreated: number;
  photosUploaded: number;
  downloadRequestsCreated: number;
  downloadRequestsApproved: number;

  // Engagement
  reviewsSubmitted: number;
  averageRating: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PhotographerMonthlyAnalytics {
  id: string;
  type: "photographer_monthly";
  photographerId: string;           // Ref → photographers
  month: string;                    // "YYYY-MM"

  // Bookings
  bookingsReceived: number;
  bookingsCompleted: number;
  bookingsCancelled: number;
  grossRevenue: number;

  // Rooms
  roomsCreated: number;
  totalPhotosUploaded: number;
  totalDownloadRequests: number;
  approvedDownloads: number;

  // Reviews
  reviewsReceived: number;
  averageRatingThisMonth: number;
  cumulativeRating: number;

  // Profile
  profileViews: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type Analytics = PlatformDailyAnalytics | PhotographerMonthlyAnalytics;

// ────────────────────────────────────────────────────────────
// COLLECTION 11: audit_logs
// Path: /audit_logs/{logId}
// Write-once, never update. Admin view only.
// ────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  action: AuditAction;
  performedBy: string;              // Auth UID of actor
  performedByRole: UserRole;
  targetId?: string;                // Document ID being acted upon
  targetCollection?: string;        // Firestore collection name
  targetType?: string;              // Human-readable entity type
  description: string;             // Human-readable log message
  metadata?: Record<string, unknown>; // Extra context (old value, new value)
  ipAddress?: string;
  userAgent?: string;
  createdAt: Timestamp;
}

// ────────────────────────────────────────────────────────────
// COLLECTION 12: settings
// Path: /settings/{documentId}
// documentId = "platform" | "features" | "pricing"
// ────────────────────────────────────────────────────────────

export interface PlatformSettings {
  id: "platform";
  appName: string;
  tagline: string;
  supportEmail: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;

  // Limits
  maxPhotosPerRoom: number;
  maxRoomsPerPhotographer: number;
  maxPortfolioImages: number;
  downloadLinkExpiryHours: number;

  // Commission
  platformCommissionPercent: number;

  // Cloudinary
  cloudinaryFolder: string;

  updatedAt: Timestamp;
  updatedBy: string;
}

export interface FeatureFlags {
  id: "features";
  enableFaceRecognition: boolean;
  enableQRCodeAccess: boolean;
  enableGuestUpload: boolean;
  enablePhotographerVerification: boolean;
  enableEmailNotifications: boolean;
  enablePushNotifications: boolean;
  enableReviews: boolean;
  enableWatermarking: boolean;
  enableAnalytics: boolean;

  updatedAt: Timestamp;
  updatedBy: string;
}

export type Settings = PlatformSettings | FeatureFlags;

// ────────────────────────────────────────────────────────────
// UTILITY TYPES
// ────────────────────────────────────────────────────────────

/** Generic pagination cursor for Firestore queries */
export interface PaginationCursor {
  lastDocId?: string;
  pageSize: number;
  direction: "forward" | "backward";
}

/** Generic paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

/** Photographer search / filter query params */
export interface PhotographerFilters {
  city?: string;
  specialties?: string[];
  minRating?: number;
  maxPrice?: number;
  minPrice?: number;
  verificationStatus?: VerificationStatus;
  isAvailable?: boolean;
  availableDate?: string;           // ISO date
  sortBy?: "rating" | "price_asc" | "price_desc" | "newest" | "bookings";
}

/** Booking search / filter query params */
export interface BookingFilters {
  customerId?: string;
  photographerId?: string;
  status?: BookingStatus;
  eventDateFrom?: string;
  eventDateTo?: string;
  sortBy?: "newest" | "oldest" | "event_date";
  isArchived?: boolean;
}

/** Download request search filters */
export interface DownloadRequestFilters {
  roomId?: string;
  photographerId?: string;
  status?: DownloadRequestStatus;
  sortBy?: "newest" | "oldest";
}

/** Photo query filters for a room */
export interface PhotoFilters {
  roomId?: string;
  status?: PhotoStatus;
  isProcessed?: boolean;
  guestId?: string;
}

// ────────────────────────────────────────────────────────────
// LEGACY RE-EXPORTS (backward compat with existing types/index)
// ────────────────────────────────────────────────────────────

export type { UserRole as Role };

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt: string;
}

export interface AnalyticsSummary {
  bookingsCount: number;
  totalRevenue: number;
  activeRooms: number;
  photosShared: number;
  ratingsAverage: number;
}
