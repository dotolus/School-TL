const request = require("supertest");
const { createTestApp, cleanupTestApp } = require("./testApp");

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUAAScy0lUAAAAASUVORK5CYII=",
  "base64"
);

let app, tmpDir, agent;

beforeEach(async () => {
  ({ app, tmpDir } = await createTestApp());
  agent = request.agent(app);
  await agent.post("/api/auth/login").send({ password: "test-password" });
});

afterEach(() => {
  cleanupTestApp(tmpDir);
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
  // Tests run with no Cloudinary credentials configured (see testApp.js),
  // so imageStore.js falls back to storing the upload as a data URI -
  // that's what gets asserted here instead of a Cloudinary/disk URL.
  it("uploads an image and attaches it to the item", async () => {
    const id = await createItem();

    const res = await agent
      .post(`/api/timeline/items/${id}/images`)
      .attach("image", TINY_PNG, "test.png");
    expect(res.status).toBe(201);
    expect(res.body.detail.images).toHaveLength(1);
    expect(res.body.detail.images[0].url).toMatch(/^data:image\/png;base64,/);
    expect(res.body.detail.images[0].id).toBeTruthy();
  });

  it("rejects a non-image upload", async () => {
    const id = await createItem();
    const res = await agent
      .post(`/api/timeline/items/${id}/images`)
      .attach("image", Buffer.from("not an image"), "test.txt");
    expect(res.status).toBe(400);
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

  it("deleting a reference drops it from the item", async () => {
    const id = await createItem();
    const upload = await agent
      .post(`/api/timeline/items/${id}/images`)
      .attach("image", TINY_PNG, "test.png");
    const image = upload.body.detail.images[0];

    const del = await agent.delete(`/api/timeline/items/${id}/images/${image.id}`);
    expect(del.status).toBe(200);
    expect(del.body.detail.images).toEqual([]);
  });
});
