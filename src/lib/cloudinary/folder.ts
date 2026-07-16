/**
 * Cloudinary Folder Strategy Constants.
 * Ensures consistent namespace paths for stored files and media.
 */
export const CLOUDINARY_FOLDERS = {
  ROOT: "snapevent",
  PROFILE_IMAGES: "snapevent/profile-images",
  PORTFOLIO: "snapevent/portfolio",
  ROOMS: "snapevent/rooms",
  GALLERY: "snapevent/gallery",
  EVENT_IMAGES: "snapevent/event-images",
} as const;

export type CloudinaryFolder = typeof CLOUDINARY_FOLDERS[keyof typeof CLOUDINARY_FOLDERS];

export default CLOUDINARY_FOLDERS;
