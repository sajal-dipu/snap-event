import { z } from "zod";
import { AddressSchema } from "@/lib/validation/schemas";

/**
 * Step 1: Event Information validation schema
 */
export const EventInfoSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters").max(100, "Event name cannot exceed 100 characters"),
  eventType: z.string().min(2, "Event type is required"),
  eventDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid event date format",
  }),
  eventTime: z.string().min(1, "Event time is required"),
  eventLocation: AddressSchema,
  description: z.string().max(500, "Description cannot exceed 500 characters").optional().default(""),
  coverImage: z.string().url("Invalid image URL").optional().or(z.literal("")),
  bookingId: z.string().optional().default(""),
});

/**
 * Step 2: Room Settings validation schema
 */
export const RoomSettingsSchema = z.object({
  allowGuestAccess: z.boolean().default(true),
  requireFaceVerification: z.boolean().default(false),
  allowDownloadRequests: z.boolean().default(true),
  autoCloseRoom: z.boolean().default(false),
  autoCloseDate: z.string().optional().or(z.literal("")),
  visibility: z.enum(["public", "private"]).default("public"),
}).refine((data) => {
  if (data.autoCloseRoom && (!data.autoCloseDate || isNaN(Date.parse(data.autoCloseDate)))) {
    return false;
  }
  return true;
}, {
  message: "Auto close date is required when auto close is enabled",
  path: ["autoCloseDate"],
});

/**
 * Combined wizard validation schema (used for client validation)
 */
export const CreateRoomFormSchema = z.object({
  // Step 1
  name: z.string().min(3, "Event name must be at least 3 characters").max(100),
  eventType: z.string().min(2, "Event type is required"),
  eventDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid event date",
  }),
  eventTime: z.string().min(1, "Event time is required"),
  eventLocation: AddressSchema,
  description: z.string().max(500).optional().default(""),
  coverImage: z.string().url("Invalid image URL").optional().or(z.literal("")),
  bookingId: z.string().optional().default(""),

  // Step 2
  allowGuestAccess: z.boolean().default(true),
  requireFaceVerification: z.boolean().default(false),
  allowDownloadRequests: z.boolean().default(true),
  autoCloseRoom: z.boolean().default(false),
  autoCloseDate: z.string().optional().or(z.literal("")),
  visibility: z.enum(["public", "private"]).default("public"),
}).refine((data) => {
  if (data.autoCloseRoom && (!data.autoCloseDate || isNaN(Date.parse(data.autoCloseDate)))) {
    return false;
  }
  return true;
}, {
  message: "Auto close date is required when auto close is enabled",
  path: ["autoCloseDate"],
});

export type ValidatedEventInfo = z.infer<typeof EventInfoSchema>;
export type ValidatedRoomSettings = z.infer<typeof RoomSettingsSchema>;
export type ValidatedCreateRoomForm = z.infer<typeof CreateRoomFormSchema>;
export type ValidatedEditRoomForm = z.infer<typeof CreateRoomFormSchema>;
