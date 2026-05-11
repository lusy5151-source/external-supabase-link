import exifr from 'exifr';

export type ExifStatus = 'pass' | 'fail' | 'warn';

export interface ExifValidationResult {
  status: ExifStatus;
  dateChecked: boolean;
  dateValid: boolean | null;
  gpsChecked: boolean;
  gpsValid: boolean | null;
  distanceKm: number | null;
  photoDate: Date | null;
  errorMessage: string | null;   // fail일 때 사용자에게 보여줄 메시지
  warnMessage: string | null;    // warn일 때 사용자에게 보여줄 메시지
}

function calcDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function validateSummitPhoto(
  file: File,
  summitLat: number,
  summitLng: number
): Promise<ExifValidationResult> {
  const result: ExifValidationResult = {
    status: 'pass',
    dateChecked: false,
    dateValid: null,
    gpsChecked: false,
    gpsValid: null,
    distanceKm: null,
    photoDate: null,
    errorMessage: null,
    warnMessage: null,
  };

  let exif: Record<string, unknown> | null = null;
  try {
    exif = await exifr.parse(file, { tiff: true, gps: true, exif: true });
  } catch {
    result.status = 'warn';
    result.warnMessage = '사진 정보를 읽을 수 없어요. AI 검증으로 넘어갈게요.';
    return result;
  }

  if (!exif) {
    result.status = 'warn';
    result.warnMessage = '사진에 촬영 정보가 없어요. AI 검증으로 넘어갈게요.';
    return result;
  }

  // ── 1) 날짜 검증 (7일 이내) ──────────────────────────────
  const takenAt = (exif.DateTimeOriginal ?? exif.DateTime ?? exif.CreateDate) as Date | undefined;
  if (takenAt instanceof Date && !isNaN(takenAt.getTime())) {
    result.dateChecked = true;
    result.photoDate = takenAt;
    const diffDays = (Date.now() - takenAt.getTime()) / (1000 * 60 * 60 * 24);
    result.dateValid = diffDays <= 7;
    if (!result.dateValid) {
      result.status = 'fail';
      result.errorMessage = `촬영일이 ${Math.floor(diffDays)}일 전 사진이에요.\n7일 이내에 찍은 사진만 인증할 수 있어요.`;
      return result;
    }
  }

  // ── 2) GPS 검증 (반경 5km 이내) ──────────────────────────
  const photoLat = (exif.latitude ?? exif.GPSLatitude) as number | undefined;
  const photoLng = (exif.longitude ?? exif.GPSLongitude) as number | undefined;
  if (photoLat !== undefined && photoLng !== undefined &&
      typeof photoLat === 'number' && typeof photoLng === 'number') {
    result.gpsChecked = true;
    const dist = calcDistanceKm(photoLat, photoLng, summitLat, summitLng);
    result.distanceKm = dist;
    result.gpsValid = dist <= 5.0;
    if (!result.gpsValid) {
      result.status = 'fail';
      result.errorMessage = `촬영 위치가 정상에서 ${dist.toFixed(1)}km 떨어져 있어요.\n정상 반경 5km 이내에서 찍은 사진만 인증할 수 있어요.`;
      return result;
    }
  } else {
    if (!result.warnMessage) {
      result.warnMessage = 'GPS 정보가 없어 위치 확인을 건너뛰었어요.';
    }
    if (result.status !== 'fail') {
      result.status = result.dateChecked ? 'pass' : 'warn';
    }
  }

  return result;
}
