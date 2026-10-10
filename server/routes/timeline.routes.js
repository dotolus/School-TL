const express = require("express");
const store = require("../services/timelineStore");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ items: store.getAll() });
});

router.post("/items", requireAuth, (req, res) => {
  try {
    const item = store.addItem(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/items/:id", requireAuth, (req, res) => {
  try {
    const updated = store.updateItem(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Item not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/items/:id", requireAuth, (req, res) => {
  const deleted = store.deleteItem(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Item not found" });
  res.status(204).end();
});

module.exports = router;
