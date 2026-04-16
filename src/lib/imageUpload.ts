import imageCompression from "browser-image-compression";
import { toast } from "@/hooks/use-toast";

const MAX_FILE_SIZE_MB = 50;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

export type ImageUploadPreset = "general" | "profile" | "summit";

const PRESET_OPTIONS: Record<ImageUploadPreset, { maxWidthOrHeight: number; quality: number }> = {
  general: { maxWidthOrHeight: 1920, quality: 0.8 },
  profile: { maxWidthOrHeight: 400, quality: 0.85 },
  summit: { maxWidthOrHeight: 1920, quality: 0.85 },
};

function getFileExtension(name: string): string {
  return name.slice(name.lastIndexOf(".")).toLowerCase();
}

function isAllowedFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  return ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_TYPES.includes(file.type);
}

function isHeicFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  return ext === ".heic" || ext === ".heif" || file.type === "image/heic" || file.type === "image/heif";
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import("heic2any")).default;
  const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  const resultBlob = Array.isArray(blob) ? blob[0] : blob;
  return new File([resultBlob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
}

export async function compressImage(file: File, preset: ImageUploadPreset = "general"): Promise<File | null> {
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    toast({ title: "파일 크기 초과", description: `최대 ${MAX_FILE_SIZE_MB}MB까지 업로드할 수 있습니다.`, variant: "destructive" });
    return null;
  }
  if (!isAllowedFile(file)) {
    toast({ title: "지원하지 않는 형식", description: "JPG, PNG, WEBP, HEIC 형식만 업로드할 수 있습니다.", variant: "destructive" });
    return null;
  }

  let processedFile = file;
  if (isHeicFile(file)) {
    try {
      processedFile = await convertHeicToJpeg(file);
    } catch (error) {
      console.error("HEIC conversion failed:", error);
      toast({ title: "HEIC 변환 실패", description: "JPG 또는 PNG로 변환 후 업로드해주세요.", variant: "destructive" });
      return null;
    }
  }

  const options = PRESET_OPTIONS[preset];
  try {
    const compressed = await imageCompression(processedFile, {
      maxWidthOrHeight: options.maxWidthOrHeight,
      initialQuality: options.quality,
      useWebWorker: true,
      fileType: "image/jpeg",
    });
    return compressed;
  } catch (error) {
    console.error("Image compression failed:", error);
    return processedFile;
  }
}

export async function compressImageToDataUrl(file: File, preset: ImageUploadPreset = "general"): Promise<string | null> {
  const compressed = await compressImage(file, preset);
  if (!compressed) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(compressed);
  });
}

export function resizeImageForAI(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const img = new Image();
    img.onload = () => {
      const maxSize = 800;
      let width = img.width;
      let height = img.height;
      if (width > height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context unavailable")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error("Image load failed")); };
    img.src = URL.createObjectURL(file);
  });
}

export const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,.heic,.heif";
