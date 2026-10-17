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
// detail.images in CLAUDE.md - so there's no deleteImage() here either.
function uploadImage(buffer, mimetype, folder) {
  if (!configured) {
    // No Cloudinary account configured (e.g. a fresh clone, or CI/e2e) -
    // fall back to an inline data URI so uploads still work end-to-end
    // instead of failing outright. Not meant for production use.
    console.warn("[imageStore] Cloudinary is not configured; storing image as a data URI");
    return Promise.resolve({
      url: `data:${mimetype};base64,${buffer.toString("base64")}`,
      publicId: null,
    });
  }

  const cloudinary = require("cloudinary").v2;
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: "image" }, (err, result) => {
      if (err) {
        console.error("[imageStore] Cloudinary upload failed:", err.message);
        return reject(err);
      }
      resolve({ url: result.secure_url, publicId: result.public_id });
    });
    stream.end(buffer);
  });
}

module.exports = { uploadImage };
