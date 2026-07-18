import { cloudinary } from "./cloudinary";
import { handleCloudinaryError } from "../errors/handlers";
import { logger } from "@/utils/logger";

/**
 * Deletes a single image from Cloudinary using its public ID.
 */
export async function deleteSingleImage(publicId: string): Promise<boolean> {
  try {
    logger.info(`[Cloudinary Delete] Initiating deletion for asset: "${publicId}"`);
    console.log(`[Cloudinary Delete] Calling uploader.destroy for: "${publicId}" with options: { resource_type: "image", invalidate: true }`);
    
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true
    });
    
    console.log(`[Cloudinary Delete] API Response received:`, JSON.stringify(result, null, 2));

    const success = result.result === "ok";
    if (success) {
      logger.info(`[Cloudinary Delete] Successfully deleted asset: "${publicId}"`);
    } else {
      logger.warn(`[Cloudinary Delete] Could not delete asset: "${publicId}". Response result code: ${result.result}`);
    }
    
    return success;
  } catch (error: any) {
    logger.error(`[Cloudinary Delete] Exception thrown while deleting asset "${publicId}":`, error);
    console.error(`[Cloudinary Delete Error Details] Message: ${error?.message}, Code: ${error?.http_code}`);
    throw handleCloudinaryError(error);
  }
}

/**
 * Deletes multiple images from Cloudinary in a single API call (max 100 per call recommended).
 */
export async function deleteMultipleImages(publicIds: string[]): Promise<Record<string, string>> {
  if (publicIds.length === 0) {
    logger.info("[Cloudinary Batch Delete] No public IDs provided for batch deletion. Skipping.");
    return {};
  }

  try {
    logger.info(`[Cloudinary Batch Delete] Initiating batch deletion for ${publicIds.length} assets`);
    console.log(`[Cloudinary Batch Delete] Public IDs to delete:`, publicIds);

    const result = await cloudinary.api.delete_resources(publicIds, {
      invalidate: true
    });
    
    console.log(`[Cloudinary Batch Delete] API Response received:`, JSON.stringify(result, null, 2));
    logger.info(`[Cloudinary Batch Delete] Completed. Deleted summary:`, result.deleted);
    return result.deleted;
  } catch (error: any) {
    logger.error("[Cloudinary Batch Delete] Failed batch deletion of assets:", error);
    console.error(`[Cloudinary Batch Delete Error Details] Message: ${error?.message}, Code: ${error?.http_code}`);
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
