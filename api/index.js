// Vercel serverless entry point. Requires server/app.js directly (not
// server/index.js) because that module never calls app.listen() or starts
// the cron scheduler - both meaningless for a function that only lives for
// the duration of one request.
module.exports = require("../server/app");
