export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  PHOTOGRAPHERS: "/photographers",
  PHOTOGRAPHER_DETAIL: (id: string) => `/photographers/${id}`,
  
  // Customer & Photographer shared dashboard
  DASHBOARD: "/dashboard",
  DASHBOARD_PROFILE: "/dashboard/profile",
  DASHBOARD_ROOMS: "/dashboard/rooms",
  DASHBOARD_GALLERY: "/dashboard/gallery",
  DASHBOARD_BOOKINGS: "/dashboard/bookings",
  DASHBOARD_DOWNLOAD_REQUESTS: "/dashboard/download-requests",
  DASHBOARD_REVIEWS: "/dashboard/reviews",
  
  // Admin dashboard
  ADMIN_LOGIN: "/admin/login",
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_PHOTOGRAPHERS: "/admin/photographers",
  ADMIN_BOOKINGS: "/admin/bookings",
  ADMIN_REVIEWS: "/admin/reviews",
  ADMIN_ANALYTICS: "/admin/analytics",
  
  // Public room path
  ROOM: (roomId: string) => `/room/${roomId}`,
} as const;

export const ROLES = {
  CUSTOMER: "customer",
  PHOTOGRAPHER: "photographer",
  ADMIN: "admin",
} as const;

export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;

export const DOWNLOAD_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const RATING_LIMITS = {
  MIN: 1,
  MAX: 5,
} as const;

export const PAGINATION_LIMITS = {
  DEFAULT: 10,
  PHOTOGRAPHERS: 8,
  GALLERY: 24,
} as const;

export const EVENT_CATEGORIES = [
  { id: "wedding", name: "Wedding", icon: "Camera" },
  { id: "pre-wedding", name: "Pre-Wedding", icon: "Heart" },
  { id: "birthday", name: "Birthday", icon: "Gift" },
  { id: "corporate", name: "Corporate", icon: "Briefcase" },
  { id: "fashion", name: "Fashion", icon: "Sparkles" },
  { id: "baby-shoot", name: "Baby Shoot", icon: "Baby" },
  { id: "engagement", name: "Engagement", icon: "Activity" },
  { id: "festival", name: "Festival", icon: "Music" },
] as const;
