const request = require("supertest");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createTestApp, cleanupTestApp } = require("./testApp");

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUAAScy0lUAAAAASUVORK5CYII=",
  "base64"
);

let app, tmpDir, agent, pngPath;

beforeEach(async () => {
  ({ app, tmpDir } = createTestApp());
  agent = request.agent(app);
  await agent.post("/api/auth/login").send({ password: "test-password" });

  pngPath = path.join(os.tmpdir(), `eq-ppt-test-${Date.now()}.png`);
  fs.writeFileSync(pngPath, TINY_PNG);
});

afterEach(() => {
  cleanupTestApp(tmpDir);
  fs.rmSync(pngPath, { force: true });
});

async function createItem() {
  const res = await agent.post("/api/timeline/items").send({
    type: "notice",
    m: 1,
    y: 2027,
    title: "t",
    short: "1.1",
    full: "1.1.2027",
  });
  return res.body.id;
}

describe("item images", () => {
  it("uploads an image, stores it on disk, and serves it publicly", async () => {
    const id = await createItem();

    const res = await agent
      .post(`/api/timeline/items/${id}/images`)
      .attach("image", pngPath);
    expect(res.status).toBe(201);
    expect(res.body.detail.images).toHaveLength(1);

    const url = res.body.detail.images[0].url;
    expect(url).toMatch(new RegExp(`^/uploads/${id}/.+\\.png$`));

    const onDisk = path.join(tmpDir, "uploads", id, path.basename(url));
    expect(fs.existsSync(onDisk)).toBe(true);

    const fetched = await request(app).get(url);
    expect(fetched.status).toBe(200);
    expect(fetched.headers["content-type"]).toBe("image/png");
  });

  it("rejects a non-image upload", async () => {
    const id = await createItem();
    const txtPath = path.join(os.tmpdir(), `eq-ppt-test-${Date.now()}.txt`);
    fs.writeFileSync(txtPath, "not an image");

    const res = await agent.post(`/api/timeline/items/${id}/images`).attach("image", txtPath);
    expect(res.status).toBe(400);
    fs.rmSync(txtPath, { force: true });
  });

  it("404s uploading to a nonexistent item", async () => {
    const res = await agent
      .post("/api/timeline/items/does-not-exist/images")
      .attach("image", TINY_PNG, "test.png");
    expect(res.status).toBe(404);
  });

  it("requires auth", async () => {
    const id = await createItem();
    const res = await request(app)
      .post(`/api/timeline/items/${id}/images`)
      .attach("image", TINY_PNG, "test.png");
    expect(res.status).toBe(401);
  });

  it("deleting a reference keeps the file on disk but drops it from the item", async () => {
    const id = await createItem();
    const upload = await agent.post(`/api/timeline/items/${id}/images`).attach("image", pngPath);
    const image = upload.body.detail.images[0];
    const onDisk = path.join(tmpDir, "uploads", id, path.basename(image.url));

    const del = await agent.delete(`/api/timeline/items/${id}/images/${image.id}`);
    expect(del.status).toBe(200);
    expect(del.body.detail.images).toEqual([]);
    expect(fs.existsSync(onDisk)).toBe(true);
  });
});
