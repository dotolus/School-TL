const express = require("express");
const { DEFAULT_CLASS_BY_SCHOOL } = require("../config");

const router = express.Router();

router.get("/:school/:period", (req, res, next) => {
  const cls = DEFAULT_CLASS_BY_SCHOOL[req.params.school];
  if (!cls) return next();
  res.redirect(302, `/${req.params.school}/${req.params.period}/${cls}`);
});

module.exports = router;
