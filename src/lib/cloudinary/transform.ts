
/**
 * Generates custom transformation URLs for Cloudinary assets.
 * Leverages Cloudinary's dynamic URL parameters for on-the-fly modifications.
 */
export const transformUrl = {
  /**
   * Generates a 250x250 face-focused cropped thumbnail URL.
   */
  thumbnail: (url: string): string => {
    if (!url) return "";
    return injectTransformation(url, "c_thumb,w_250,h_250,g_face,q_auto,f_auto");
  },

  /**
   * Generates an 800px width limit optimized view URL.
   */
  medium: (url: string): string => {
    if (!url) return "";
    return injectTransformation(url, "c_limit,w_800,q_auto,f_auto");
  },

  /**
   * Generates a 1600px width limit high-res view URL.
   */
  large: (url: string): string => {
    if (!url) return "";
    return injectTransformation(url, "c_limit,w_1600,q_auto,f_auto");
  },

  /**
   * Generates a view URL overlayed with a secure semi-transparent text watermark.
   */
  watermark: (url: string, text: string = "SnapEvent"): string => {
    if (!url) return "";
    // Encodes the watermark text. E.g. "SnapEvent" -> "SnapEvent"
    const encodedText = encodeURIComponent(text).replace(/%/g, "%25");
    const watermarkTransformation = `l_text:Helvetica_40_bold:${encodedText},co_white,o_25,w_0.6,c_scale/fl_layer_apply,g_center`;
    return injectTransformation(url, `q_auto,f_auto,${watermarkTransformation}`);
  },

  /**
   * Dynamically formats and optimizes the quality of the image.
   */
  optimize: (url: string): string => {
    if (!url) return "";
    return injectTransformation(url, "q_auto,f_auto");
  },

  /**
   * Explicitly transforms image to WebP format.
   */
  webp: (url: string): string => {
    if (!url) return "";
    return injectTransformation(url, "f_webp,q_auto");
  },

  /**
   * Explicitly transforms image to AVIF format if supported.
   */
  avif: (url: string): string => {
    if (!url) return "";
    return injectTransformation(url, "f_avif,q_auto");
  },
};

/**
 * Injects a transformation segment into a standard Cloudinary URL.
 * Matches the '/upload/' segment of the URL and appends transformations.
 */
function injectTransformation(url: string, transformation: string): string {
  if (!url.includes("cloudinary.com")) return url;

  // Split at '/upload/' marker segment
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;

  const [baseUrl, fileUrl] = parts;
  return `${baseUrl}/upload/${transformation}/${fileUrl}`;
}

export default transformUrl;
