import { cloudinary } from "@/lib/cloudinary/cloudinary";

export async function GET() {
   try {
      const ping =
        await cloudinary.api.ping();

      const resources =
        await cloudinary.api.resources({
          max_results:1
        });

      return Response.json({
         success:true,
         ping,
         resources
      });

   } catch(error){
      return Response.json({
         success:false,
         error
      });
   }
}
