// Express 4 doesn't catch rejected promises from async handlers on its own -
// wrap each one so an unexpected failure reaches the error middleware
// instead of hanging the request.
module.exports = function asyncHandler(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
};
