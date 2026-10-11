const fs = require("fs");

module.exports = async () => {
  const dir = process.env.EQ_PPT_E2E_DATA_DIR;
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
};
