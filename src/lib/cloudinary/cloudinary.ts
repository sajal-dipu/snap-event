import { v2 as cloudinary } from "cloudinary";
import { validateCloudinaryEnv } from "../validation/envValidation";

// Validate environment variables on initialization
validateCloudinaryEnv();

// Initialize Server-side Cloudinary SDK configuration
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };
export default cloudinary;
