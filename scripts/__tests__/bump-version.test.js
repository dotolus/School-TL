const fs = require("fs");
const os = require("os");
const path = require("path");

const { bumpVersion, detectBumpType, applyBump } = require("../bump-version");

describe("bumpVersion", () => {
  it("increments major and resets minor/patch", () => {
    expect(bumpVersion("1.2.3", "major")).toBe("2.0.0");
  });

  it("increments minor and resets patch", () => {
    expect(bumpVersion("1.2.3", "minor")).toBe("1.3.0");
  });

  it("increments patch only", () => {
    expect(bumpVersion("1.2.3", "patch")).toBe("1.2.4");
  });

  it("throws on an unparsable version", () => {
    expect(() => bumpVersion("not-a-version", "patch")).toThrow(/Cannot parse version/);
  });

  it("throws on an unknown bump type", () => {
    expect(() => bumpVersion("1.0.0", "bogus")).toThrow(/Unknown bump type/);
  });
});

describe("detectBumpType", () => {
  it("detects a major bump from BREAKING CHANGE in the body", () => {
    expect(detectBumpType("feat: add thing\n\nBREAKING CHANGE: removes old API")).toBe("major");
  });

  it("detects a major bump from a feat! subject", () => {
    expect(detectBumpType("feat!: drop legacy endpoint")).toBe("major");
  });

  it("detects a major bump from an explicit major: prefix", () => {
    expect(detectBumpType("major: rewrite auth flow")).toBe("major");
  });

  it("detects a minor bump from a feat: subject", () => {
    expect(detectBumpType("feat: add CSV export")).toBe("minor");
  });

  it("falls back to patch for fix/chore/docs or unprefixed messages", () => {
    expect(detectBumpType("fix: correct off-by-one in month grouping")).toBe("patch");
    expect(detectBumpType("chore: tidy up imports")).toBe("patch");
    expect(detectBumpType("Add admin bulk import for timeline data")).toBe("patch");
  });
});

describe("applyBump", () => {
  let tmpDir, rootPkgPath, clientPkgPath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eq-ppt-version-"));
    rootPkgPath = path.join(tmpDir, "package.json");
    clientPkgPath = path.join(tmpDir, "client-package.json");
    fs.writeFileSync(rootPkgPath, JSON.stringify({ name: "x", version: "1.2.3" }, null, 2) + "\n");
    fs.writeFileSync(
      clientPkgPath,
      JSON.stringify({ name: "x-client", version: "1.2.3" }, null, 2) + "\n"
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("bumps both package.json files to the same new version", () => {
    const newVersion = applyBump("minor", { rootPkgPath, clientPkgPath });
    expect(newVersion).toBe("1.3.0");
    expect(JSON.parse(fs.readFileSync(rootPkgPath, "utf8")).version).toBe("1.3.0");
    expect(JSON.parse(fs.readFileSync(clientPkgPath, "utf8")).version).toBe("1.3.0");
  });

  it("skips the client package.json if it doesn't exist", () => {
    fs.rmSync(clientPkgPath);
    const newVersion = applyBump("patch", { rootPkgPath, clientPkgPath });
    expect(newVersion).toBe("1.2.4");
    expect(fs.existsSync(clientPkgPath)).toBe(false);
  });
});
