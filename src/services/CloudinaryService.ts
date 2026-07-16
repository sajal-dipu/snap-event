import * as deleteService from "@/lib/cloudinary/delete";
import { transformUrl } from "@/lib/cloudinary/transform";
import { CloudinaryFolder } from "@/lib/cloudinary/folder";

export class CloudinaryService {

  /**
   * Delete a single image from Cloudinary using public ID.
   */
  public async deleteSingle(publicId: string): Promise<boolean> {
    return deleteService.deleteSingleImage(publicId);
  }

  /**
   * Delete multiple images in a single call.
   */
  public async deleteMultiple(publicIds: string[]) {
    return deleteService.deleteMultipleImages(publicIds);
  }

  /**
   * Clear all items in a folder suffix prefix.
   */
  public async cleanupFolder(folderPath: string): Promise<boolean> {
    return deleteService.cleanupFolder(folderPath);
  }

  /**
   * Dynamic image url transformations
   */
  public get transform() {
    return transformUrl;
  }
}

export const cloudinaryService = new CloudinaryService();
export default cloudinaryService;
