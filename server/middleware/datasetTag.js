function attachDatasetTag(req, res, next) {
  req.datasetTag = { school: req.params.school, period: req.params.period, class: req.params.class };
  next();
}

module.exports = { attachDatasetTag };
