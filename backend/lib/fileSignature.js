/** Verifies a file's *actual* bytes against the MIME type it claims to be.
 *
 *  `file.type` on a FormData upload comes straight from the multipart part's
 *  Content-Type header, which the client controls. Trusting it alone (as
 *  media.js/r2Evidence.js did before) means an attacker can label arbitrary
 *  bytes as "image/png" and have us store and publicly re-serve them under
 *  that Content-Type. This checks the file's magic number (its first few
 *  bytes) against the well-known signature for each type we accept, so the
 *  declared type has to match what the file actually is. */

const SIGNATURES = [
  { mime: 'image/png', match: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a },
  { mime: 'image/jpeg', match: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/gif', match: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61 },
  { mime: 'image/webp', match: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
  // ISO base media file format (mp4/mov/m4v/...): 4-byte size, then "ftyp".
  { mime: 'video/mp4', match: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 },
  // Matroska/WebM EBML header, shared by .webm and .mkv, but we only ever
  // accept video/webm in ALLOWED_TYPES so that's the only one that matters.
  { mime: 'video/webm', match: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
];

const SNIFF_BYTES = 16;

/** Returns the sniffed MIME type for `file`'s real content, or null if it
 *  doesn't match any known signature. Never throws. */
export async function sniffFileType(file) {
  try {
    const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
    for (const sig of SIGNATURES) {
      if (sig.match(head)) return sig.mime;
    }
    return null;
  } catch (err) {
    return null;
  }
}

/** True only if `file.type` is both in `allowedTypes` AND matches what the
 *  file's actual bytes say it is. */
export async function verifyFileType(file, allowedTypes) {
  if (!allowedTypes.includes(file.type)) return false;
  const sniffed = await sniffFileType(file);
  return sniffed !== null && sniffed === file.type;
}
