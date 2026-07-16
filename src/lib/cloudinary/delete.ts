import { cloudinary } from "./cloudinary";
import { handleCloudinaryError } from "../errors/handlers";
import { logger } from "@/utils/logger";

/**
 * Deletes a single image from Cloudinary using its public ID.
 */
export async function deleteSingleImage(publicId: string): Promise<boolean> {
  try {
    logger.info(`Deleting single Cloudinary asset: ${publicId}`);
    const result = await cloudinary.uploader.destroy(publicId);
    
    const success = result.result === "ok";
    if (success) {
      logger.info(`Successfully deleted asset: ${publicId}`);
    } else {
      logger.warn(`Could not delete asset: ${publicId}. Result code: ${result.result}`);
    }
    
    return success;
  } catch (error) {
    logger.error(`Error deleting asset ${publicId}:`, error);
    throw handleCloudinaryError(error);
  }
}

/**
 * Deletes multiple images from Cloudinary in a single API call (max 100 per call recommended).
 */
export async function deleteMultipleImages(publicIds: string[]): Promise<Record<string, string>> {
  if (publicIds.length === 0) return {};

  try {
    logger.info(`Batch deleting ${publicIds.length} assets from Cloudinary`);
    const result = await cloudinary.api.delete_resources(publicIds);
    
    logger.info("Batch deletion complete:", result.deleted);
    return result.deleted;
  } catch (error) {
    logger.error("Failed batch deletion of assets:", error);
    throw handleCloudinaryError(error);
  }
}

/**
 * Cleans up all resources inside a folder prefix directory.
 */
export async function cleanupFolder(folderPath: string): Promise<boolean> {
  try {
    logger.info(`Cleaning up all assets in Cloudinary folder path: ${folderPath}`);
    
    // Delete all resources matching prefix path
    const result = await cloudinary.api.delete_resources_by_prefix(folderPath);
    
    logger.info("Folder assets deletion complete:", result.deleted);
    
    // Optional: Delete the empty subfolders
    try {
      await cloudinary.api.delete_folder(folderPath);
      logger.info(`Successfully deleted folder path structure: ${folderPath}`);
    } catch (subfolderError) {
      // Folder might contain subfolders that aren't empty, or require direct recursion
      logger.warn(`Could not delete directory tree namespace ${folderPath}:`, subfolderError);
    }
    
    return true;
  } catch (error) {
    logger.error(`Error cleaning up folder ${folderPath}:`, error);
    throw handleCloudinaryError(error);
  }
}
