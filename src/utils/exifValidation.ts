import exifr from 'exifr';

export interface ExifValidationResult {
  isValid: boolean;
  dateValid: boolean | null;
  gpsValid: boolean | null;
  errorMessage: string | null;
  warningMessage: string | null;
  distanceKm: number | null;
  photoDate: Date | null;
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function validateSummitPhoto(
  file: File,
  summitLat: number,
  summitLng: number
): Promise<ExifValidationResult> {
  const result: ExifValidationResult = {
    isValid: false,
    dateValid: null,
    gpsValid: null,
    errorMessage: null,
    warningMessage: null,
    distanceKm: null,
    photoDate: null,
  };

  try {
    const exif = await exifr.parse(file, { tiff: true, gps: true, exif: true });

    if (!exif) {
      result.isValid = true;
      result.warningMessage = '사진에 촬영 정보가 없어요. 실제 정상에서 찍은 사진인지 확인해주세요.';
      return result;
    }

    const takenAt: Date | undefined = exif.DateTimeOriginal ?? exif.DateTime ?? exif.CreateDate;
    if (takenAt) {
      result.photoDate = takenAt;
      const diffDays = (Date.now() - takenAt.getTime()) / (1000 * 60 * 60 * 24);
      result.dateValid = diffDays <= 7;
      if (!result.dateValid) {
        result.errorMessage = `촬영일이 ${Math.floor(diffDays)}일 전 사진이에요. 7일 이내에 찍은 사진만 인증할 수 있어요.`;
        return result;
      }
    } else {
      result.warningMessage = '촬영 날짜를 확인할 수 없어요.';
    }

    const lat: number | undefined = exif.latitude ?? exif.GPSLatitude;
    const lng: number | undefined = exif.longitude ?? exif.GPSLongitude;
    if (lat !== undefined && lng !== undefined) {
      const dist = getDistanceKm(lat, lng, summitLat, summitLng);
      result.distanceKm = dist;
      result.gpsValid = dist <= 5.0;
      if (!result.gpsValid) {
        result.errorMessage = `촬영 위치가 정상에서 ${dist.toFixed(1)}km 떨어져 있어요. 정상 반경 5km 이내에서 찍은 사진만 인증할 수 있어요.`;
        return result;
      }
    } else {
      result.warningMessage = (result.warningMessage ? result.warningMessage + ' ' : '') +
        'GPS 정보가 없어 위치 확인을 건너뛰었어요.';
    }

    result.isValid = true;
    return result;
  } catch {
    result.isValid = true;
    result.warningMessage = '사진 정보를 읽을 수 없어요. 계속 진행할게요.';
    return result;
  }
}
