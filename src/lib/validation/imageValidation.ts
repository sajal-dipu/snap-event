import { z } from "zod";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];

export const ImageFileSchema = z
  .custom<File>((val) => val instanceof File, "Input must be a File object")
  .refine((file) => file.size <= MAX_FILE_SIZE, {
    message: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
  })
  .refine(
    (file) =>
      ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase()) ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif"),
    {
      message: `Allowed image formats: ${ALLOWED_IMAGE_TYPES.map((t) => t.split("/")[1]).join(", ")}`,
    }
  );

export const CloudinaryErrorSchema = z.object({
  error: z.object({
    message: z.string(),
  }),
});

export function validateImageFile(file: File) {
  return ImageFileSchema.parse(file);
}
