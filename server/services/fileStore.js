const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = require("../config");

const configured = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

if (configured) {
  const cloudinary = require("cloudinary").v2;
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
}

// Uploads never delete the backing file on removal - see the note on
// detail.attachments in CLAUDE.md - so there's no deleteFile() here either.
function uploadFile(buffer, mimetype, folder) {
  if (!configured) {
    // No Cloudinary account configured (e.g. a fresh clone, or CI/e2e) -
    // fall back to an inline data URI so uploads still work end-to-end
    // instead of failing outright. Not meant for production use.
    console.warn("[fileStore] Cloudinary is not configured; storing file as a data URI");
    return Promise.resolve({
      url: `data:${mimetype};base64,${buffer.toString("base64")}`,
      publicId: null,
    });
  }

  const cloudinary = require("cloudinary").v2;
  const resourceType = mimetype.startsWith("image/") ? "image" : "raw";
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: resourceType }, (err, result) => {
      if (err) {
        console.error("[fileStore] Cloudinary upload failed:", err.message);
        return reject(err);
      }
      resolve({ url: result.secure_url, publicId: result.public_id });
    });
    stream.end(buffer);
  });
}

module.exports = { uploadFile };
