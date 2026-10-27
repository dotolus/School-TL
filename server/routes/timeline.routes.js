const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const store = require("../services/timelineStore");
const fileStore = require("../services/fileStore");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const KIND_BY_MIME = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "application/pdf": "pdf",
  "text/plain": "text",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!KIND_BY_MIME[file.mimetype]) {
      return cb(new Error("Only JPEG, PNG, GIF, WebP images, PDF, plain text, or zip files are allowed"));
    }
    cb(null, true);
  },
});

function uploadSingleFile(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err) {
      console.warn("[timeline] File upload rejected:", err.message);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/json" && !file.originalname.endsWith(".json")) {
      return cb(new Error("Only JSON files are allowed"));
    }
    cb(null, true);
  },
});

function uploadImportFile(req, res, next) {
  importUpload.single("file")(req, res, (err) => {
    if (err) {
      console.warn("[timeline] Import file rejected:", err.message);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ items: await store.getAll() });
  })
);

router.post(
  "/import",
  requireAuth,
  uploadImportFile,
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    let parsed;
    try {
      parsed = JSON.parse(req.file.buffer.toString("utf8"));
    } catch {
      console.warn("[timeline] Import failed: file is not valid JSON");
      return res.status(400).json({ error: "File is not valid JSON" });
    }

    const items = Array.isArray(parsed) ? parsed : parsed.items;
    if (!Array.isArray(items)) {
      console.warn("[timeline] Import failed: no items array found in file");
      return res.status(400).json({ error: "File must contain an 'items' array (matching GET /api/timeline)" });
    }

    try {
      const result = await store.importItems(items);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message, details: err.details });
    }
  })
);

router.post(
  "/items",
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      const item = await store.addItem(req.body);
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  })
);

router.put(
  "/items/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      const updated = await store.updateItem(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Item not found" });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  })
);

router.delete(
  "/items/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const deleted = await store.deleteItem(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Item not found" });
    res.status(204).end();
  })
);

function withAttachments(item, attachments) {
  // Firestore rejects `undefined` field values, so the old `images` key
  // (if present on an item created before this field was renamed) must be
  // deleted outright rather than overwritten with `images: undefined`.
  const restDetail = { ...item.detail };
  delete restDetail.images;
  return {
    type: item.type,
    m: item.m,
    y: item.y,
    title: item.title,
    short: item.short,
    full: item.full,
    detail: { ...restDetail, attachments },
    "required-white-shirt": item["required-white-shirt"],
    "required-food": item["required-food"],
    "required-parent-signature": item["required-parent-signature"],
  };
}

function requireExistingItem(req, res, next) {
  store.getItem(req.params.id).then((item) => {
    if (!item) {
      req.resume(); // drain the still-uploading body before rejecting
      return res.status(404).json({ error: "Item not found" });
    }
    next();
  }, next);
}

router.post(
  "/items/:id/attachments",
  requireAuth,
  requireExistingItem,
  uploadSingleFile,
  asyncHandler(async (req, res) => {
    const item = await store.getItem(req.params.id);
    if (!req.file) {
      console.warn(`[timeline] File upload failed: no file provided for item ${req.params.id}`);
      return res.status(400).json({ error: "No file provided" });
    }

    const { url, publicId } = await fileStore.uploadFile(req.file.buffer, req.file.mimetype, `eq-ppt/${item.id}`);
    const attachment = {
      id: crypto.randomUUID(),
      url,
      publicId,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      kind: KIND_BY_MIME[req.file.mimetype],
    };
    const attachments = [...(item.detail?.attachments || []), attachment];
    const updated = await store.updateItem(item.id, withAttachments(item, attachments));
    res.status(201).json(updated);
  })
);

router.delete(
  "/items/:id/attachments/:attachmentId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const item = await store.getItem(req.params.id);
    if (!item) {
      console.warn(`[timeline] File delete failed: item ${req.params.id} not found`);
      return res.status(404).json({ error: "Item not found" });
    }

    const attachments = (item.detail?.attachments || []).filter((a) => a.id !== req.params.attachmentId);
    const updated = await store.updateItem(item.id, withAttachments(item, attachments));
    res.json(updated);
  })
);

module.exports = router;
