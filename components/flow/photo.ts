/** Longest side, in pixels, of the photo we send. Plenty for spotting doors and windows. */
const MAX_SIDE = 1280;

export interface PreparedPhoto {
  mimeType: "image/jpeg";
  /** Base64 without the data URL prefix, for the API. */
  data: string;
  /** Data URL, for showing the photo back to the user. */
  url: string;
}

/**
 * Downscales and re-encodes the photo in the browser before it is sent.
 * Re-encoding through a canvas also drops EXIF metadata such as GPS location.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!file.type.startsWith("image/")) throw new Error("That file is not an image.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't prepare the photo.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const url = canvas.toDataURL("image/jpeg", 0.85);
  return { mimeType: "image/jpeg", data: url.slice(url.indexOf(",") + 1), url };
}
