const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = require("../config");

const configured = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

// Cloudinary's resource_type: "raw" has no idea what kind of file it's
// storing - we upload from an in-memory Buffer (no original filename on the
// stream), so without an explicit `format` Cloudinary gives the delivered
// resource no extension and serves it as generic application/octet-stream.
// That's why a browser can neither render it inline nor suggest a sane
// download name. `resource_type: "image"` doesn't need this - Cloudinary
// inspects the actual image bytes and picks the right format itself.
const RAW_EXT_BY_MIME = {
  "application/pdf": "pdf",
  "text/plain": "txt",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
};

if (configured) {
  const cloudinary = require("cloudinary").v2;
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
}

function resourceOptionsForUpload(mimetype, folder) {
  const resourceType = mimetype.startsWith("image/") ? "image" : "raw";
  const options = { folder, resource_type: resourceType };
  if (resourceType === "raw" && RAW_EXT_BY_MIME[mimetype]) {
    options.format = RAW_EXT_BY_MIME[mimetype];
  }
  return options;
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
  const options = resourceOptionsForUpload(mimetype, folder);
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) {
        console.error("[fileStore] Cloudinary upload failed:", err.message);
        return reject(err);
      }
      resolve({ url: result.secure_url, publicId: result.public_id });
    });
    stream.end(buffer);
  });
}

module.exports = { uploadFile, resourceOptionsForUpload };
