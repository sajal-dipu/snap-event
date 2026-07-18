import { v2 as cloudinary } from "cloudinary";

console.log(
 "Cloudinary Config:",
 {
   cloudName:
   process.env.CLOUDINARY_CLOUD_NAME,

   apiKey:
   !!process.env.CLOUDINARY_API_KEY,

   apiSecret:
   !!process.env.CLOUDINARY_API_SECRET
 }
);

cloudinary.config({
  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,

  api_key:
    process.env.CLOUDINARY_API_KEY,

  api_secret:
    process.env.CLOUDINARY_API_SECRET,

  secure: true
});

export { cloudinary };
