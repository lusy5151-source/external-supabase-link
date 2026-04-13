export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

type CompressTarget = "profile" | "general";

const MAX_SIZES: Record<CompressTarget, { width: number; quality: number }> = {
  profile: { width: 400, quality: 0.8 },
  general: { width: 1200, quality: 0.75 },
};

export async function compressImage(file: File, target: CompressTarget = "general"): Promise<File | null> {
  try {
    let processFile = file;
    if (file.type === "image/heic" || file.type === "image/heif" || file.name.toLowerCase().endsWith(".heic")) {
      const heic2any = (await import("heic2any")).default;
      const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 }) as Blob;
      processFile = new File([blob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
    }
    const { default: imageCompression } = await import("browser-image-compression");
    const { width, quality } = MAX_SIZES[target];
    const compressed = await imageCompression(processFile, {
      maxWidthOrHeight: width,
      initialQuality: quality,
      useWebWorker: true,
      fileType: "image/jpeg",
    });
    return new File([compressed], processFile.name, { type: "image/jpeg" });
  } catch (err) {
    console.error("Image compression failed:", err);
    return null;
  }
}
