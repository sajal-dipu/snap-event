export interface ExifMetadata {
  camera?: string;
  lens?: string;
  iso?: number;
  shutterSpeed?: string;
  aperture?: string;
  gps?: {
    latitude: number;
    longitude: number;
  };
  takenAt?: string; // ISO String
}

/**
 * Extracts EXIF metadata from a image file client-side.
 * Reads the APP1 segment in JPEGs and parses TIFF IFD tags.
 */
export async function extractExif(file: File): Promise<ExifMetadata | null> {
  if (!file.type.includes("jpeg") && !file.type.includes("jpg")) {
    return null; // For HEIC/PNG/WEBP, return null (exif parsing fallback)
  }

  try {
    // Read the first 128KB of the file which contains the EXIF APP1 block
    const sliceSize = Math.min(file.size, 128 * 1024);
    const buffer = await file.slice(0, sliceSize).arrayBuffer();
    const view = new DataView(buffer);

    // Verify JPEG SOI marker (0xFFD8)
    if (view.getUint16(0, false) !== 0xffd8) {
      return null;
    }

    let offset = 2;
    const length = view.byteLength;
    let app1Offset = -1;

    // Scan for APP1 (0xFFE1) marker
    while (offset < length - 2) {
      const marker = view.getUint16(offset, false);
      const segmentLength = view.getUint16(offset + 2, false);

      if (marker === 0xffe1) {
        // Found APP1 marker
        app1Offset = offset;
        break;
      }

      offset += 2 + segmentLength;
    }

    if (app1Offset === -1) {
      return null;
    }

    // EXIF header starts 6 bytes after the APP1 marker length: "Exif\0\0"
    const exifHeaderOffset = app1Offset + 4;
    const isExif =
      view.getUint32(exifHeaderOffset, false) === 0x45786966 && // "Exif"
      view.getUint16(exifHeaderOffset + 4, false) === 0x0000;

    if (!isExif) {
      return null;
    }

    const tiffHeaderOffset = exifHeaderOffset + 6;
    const byteOrder = view.getUint16(tiffHeaderOffset, false);
    const isLittleEndian = byteOrder === 0x4949; // "II"

    // Verify TIFF Magic number (42)
    if (view.getUint16(tiffHeaderOffset + 2, isLittleEndian) !== 42) {
      return null;
    }

    const firstIFDOffset = view.getUint32(tiffHeaderOffset + 4, isLittleEndian);
    if (firstIFDOffset < 8) {
      return null;
    }

    const metadata: ExifMetadata = {};
    const tags = parseIFD(view, tiffHeaderOffset, firstIFDOffset, isLittleEndian);

    // Camera details
    const make = tags[0x010f] as string;
    const model = tags[0x0110] as string;
    if (model) {
      metadata.camera = make ? `${make} ${model}` : model;
    }

    // SubIFD (EXIF specific details)
    const exifIFDOffset = tags[0x8769] as number;
    if (exifIFDOffset) {
      const exifTags = parseIFD(view, tiffHeaderOffset, exifIFDOffset, isLittleEndian);

      // ISO
      metadata.iso = exifTags[0x8827] as number;

      // Aperture (FNumber)
      const fNumber = exifTags[0x829d] as number;
      if (fNumber) {
        metadata.aperture = `f/${fNumber.toFixed(1)}`;
      }

      // Shutter Speed (ExposureTime)
      const expTime = exifTags[0x829a] as number;
      if (expTime) {
        metadata.shutterSpeed = expTime < 1 ? `1/${Math.round(1 / expTime)}s` : `${expTime}s`;
      }

      // Lens Model
      metadata.lens = exifTags[0xa434] as string;

      // Date Time Original
      const dateTimeOriginal = exifTags[0x9003] as string;
      if (dateTimeOriginal) {
        // Format: "YYYY:MM:DD HH:MM:SS" -> ISO String
        const parts = dateTimeOriginal.split(" ");
        if (parts.length === 2) {
          const dateParts = parts[0].replace(/:/g, "-");
          metadata.takenAt = new Date(`${dateParts}T${parts[1]}`).toISOString();
        }
      }
    }

    // GPS Info
    const gpsIFDOffset = tags[0x8825] as number;
    if (gpsIFDOffset) {
      const gpsTags = parseIFD(view, tiffHeaderOffset, gpsIFDOffset, isLittleEndian);
      const latRef = gpsTags[1] as string; // 'N' or 'S'
      const latCoords = gpsTags[2] as number[]; // [D, M, S]
      const lonRef = gpsTags[3] as string; // 'E' or 'W'
      const lonCoords = gpsTags[4] as number[]; // [D, M, S]

      if (latRef && latCoords && lonRef && lonCoords) {
        const latitude = convertDMSToDD(latCoords[0], latCoords[1], latCoords[2], latRef);
        const longitude = convertDMSToDD(lonCoords[0], lonCoords[1], lonCoords[2], lonRef);
        metadata.gps = { latitude, longitude };
      }
    }

    return metadata;
  } catch (error) {
    console.warn("Failed parsing EXIF client-side:", error);
    return null;
  }
}

function parseIFD(
  view: DataView,
  tiffHeaderOffset: number,
  ifdOffset: number,
  isLittleEndian: boolean
): Record<number, any> {
  const tags: Record<number, any> = {};
  const globalOffset = tiffHeaderOffset + ifdOffset;
  const numEntries = view.getUint16(globalOffset, isLittleEndian);

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = globalOffset + 2 + i * 12;
    const tag = view.getUint16(entryOffset, isLittleEndian);
    const type = view.getUint16(entryOffset + 2, isLittleEndian);
    const count = view.getUint32(entryOffset + 4, isLittleEndian);
    const valueOffset = entryOffset + 8;

    let value: any;

    // Type parsing
    if (type === 2) {
      // ASCII
      const offset = count <= 4 ? valueOffset : tiffHeaderOffset + view.getUint32(valueOffset, isLittleEndian);
      const chars: string[] = [];
      for (let j = 0; j < count - 1; j++) {
        chars.push(String.fromCharCode(view.getUint8(offset + j)));
      }
      value = chars.join("").trim();
    } else if (type === 3) {
      // SHORT (16-bit int)
      value = view.getUint16(valueOffset, isLittleEndian);
    } else if (type === 4) {
      // LONG (32-bit int)
      value = view.getUint32(valueOffset, isLittleEndian);
    } else if (type === 5 || type === 10) {
      // RATIONAL / SRATIONAL
      const offset = tiffHeaderOffset + view.getUint32(valueOffset, isLittleEndian);
      if (count === 1) {
        const num = view.getUint32(offset, isLittleEndian);
        const den = view.getUint32(offset + 4, isLittleEndian);
        value = den === 0 ? 0 : num / den;
      } else {
        const rationals: number[] = [];
        for (let j = 0; j < count; j++) {
          const num = view.getUint32(offset + j * 8, isLittleEndian);
          const den = view.getUint32(offset + j * 8 + 4, isLittleEndian);
          rationals.push(den === 0 ? 0 : num / den);
        }
        value = rationals;
      }
    } else {
      value = view.getUint32(valueOffset, isLittleEndian);
    }

    tags[tag] = value;
  }

  return tags;
}

function convertDMSToDD(d: number, m: number, s: number, ref: string): number {
  let dd = d + m / 60 + s / 3600;
  if (ref === "S" || ref === "W") {
    dd = -dd;
  }
  return dd;
}
