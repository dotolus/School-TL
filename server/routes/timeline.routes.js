const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const store = require("../services/timelineStore");
const imageStore = require("../services/imageStore");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!EXT_BY_MIME[file.mimetype]) {
      return cb(new Error("Only JPEG, PNG, GIF, or WebP images are allowed"));
    }
    cb(null, true);
  },
});

function uploadSingleImage(req, res, next) {
  upload.single("image")(req, res, (err) => {
    if (err) {
      console.warn("[timeline] Image upload rejected:", err.message);
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

function withImages(item, images) {
  return {
    type: item.type,
    m: item.m,
    y: item.y,
    title: item.title,
    short: item.short,
    full: item.full,
    detail: { ...item.detail, images },
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
  "/items/:id/images",
  requireAuth,
  requireExistingItem,
  uploadSingleImage,
  asyncHandler(async (req, res) => {
    const item = await store.getItem(req.params.id);
    if (!req.file) {
      console.warn(`[timeline] Image upload failed: no file provided for item ${req.params.id}`);
      return res.status(400).json({ error: "No image file provided" });
    }

    const { url, publicId } = await imageStore.uploadImage(req.file.buffer, req.file.mimetype, `eq-ppt/${item.id}`);
    const image = { id: crypto.randomUUID(), url, publicId };
    const images = [...(item.detail?.images || []), image];
    const updated = await store.updateItem(item.id, withImages(item, images));
    res.status(201).json(updated);
  })
);

router.delete(
  "/items/:id/images/:imageId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const item = await store.getItem(req.params.id);
    if (!item) {
      console.warn(`[timeline] Image delete failed: item ${req.params.id} not found`);
      return res.status(404).json({ error: "Item not found" });
    }

    const images = (item.detail?.images || []).filter((img) => img.id !== req.params.imageId);
    const updated = await store.updateItem(item.id, withImages(item, images));
    res.json(updated);
  })
);

module.exports = router;
