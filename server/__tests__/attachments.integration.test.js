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

describe("item attachments", () => {
  // Tests run with no Cloudinary credentials configured (see testApp.js),
  // so fileStore.js falls back to storing the upload as a data URI -
  // that's what gets asserted here instead of a Cloudinary/disk URL.
  it("uploads an image and attaches it to the item", async () => {
    const id = await createItem();

    const res = await agent
      .post(`/api/timeline/items/${id}/attachments`)
      .attach("file", TINY_PNG, "test.png");
    expect(res.status).toBe(201);
    expect(res.body.detail.attachments).toHaveLength(1);
    const [attachment] = res.body.detail.attachments;
    expect(attachment.url).toMatch(/^data:image\/png;base64,/);
    expect(attachment.id).toBeTruthy();
    expect(attachment.kind).toBe("image");
    expect(attachment.filename).toBe("test.png");
  });

  it("uploads a PDF with kind \"pdf\"", async () => {
    const id = await createItem();
    const res = await agent
      .post(`/api/timeline/items/${id}/attachments`)
      .attach("file", Buffer.from("%PDF-1.4 fake"), { filename: "doc.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(201);
    expect(res.body.detail.attachments[0].kind).toBe("pdf");
  });

  it("uploads a text file with kind \"text\"", async () => {
    const id = await createItem();
    const res = await agent
      .post(`/api/timeline/items/${id}/attachments`)
      .attach("file", Buffer.from("hello"), { filename: "notes.txt", contentType: "text/plain" });
    expect(res.status).toBe(201);
    expect(res.body.detail.attachments[0].kind).toBe("text");
  });

  it("uploads a zip file with kind \"zip\"", async () => {
    const id = await createItem();
    const res = await agent
      .post(`/api/timeline/items/${id}/attachments`)
      .attach("file", Buffer.from("PK\x03\x04fake"), { filename: "archive.zip", contentType: "application/zip" });
    expect(res.status).toBe(201);
    expect(res.body.detail.attachments[0].kind).toBe("zip");
  });

  it("rejects a disallowed file type", async () => {
    const id = await createItem();
    const res = await agent
      .post(`/api/timeline/items/${id}/attachments`)
      .attach("file", Buffer.from("binary"), { filename: "test.bin", contentType: "application/octet-stream" });
    expect(res.status).toBe(400);
  });

  it("rejects a file over the size limit", async () => {
    const id = await createItem();
    const tooBig = Buffer.alloc(21 * 1024 * 1024);
    const res = await agent
      .post(`/api/timeline/items/${id}/attachments`)
      .attach("file", tooBig, { filename: "big.png", contentType: "image/png" });
    expect(res.status).toBe(400);
  });

  it("404s uploading to a nonexistent item", async () => {
    const res = await agent
      .post("/api/timeline/items/does-not-exist/attachments")
      .attach("file", TINY_PNG, "test.png");
    expect(res.status).toBe(404);
  });

  it("requires auth", async () => {
    const id = await createItem();
    const res = await request(app)
      .post(`/api/timeline/items/${id}/attachments`)
      .attach("file", TINY_PNG, "test.png");
    expect(res.status).toBe(401);
  });

  it("deleting a reference drops it from the item", async () => {
    const id = await createItem();
    const upload = await agent
      .post(`/api/timeline/items/${id}/attachments`)
      .attach("file", TINY_PNG, "test.png");
    const attachment = upload.body.detail.attachments[0];

    const del = await agent.delete(`/api/timeline/items/${id}/attachments/${attachment.id}`);
    expect(del.status).toBe(200);
    expect(del.body.detail.attachments).toEqual([]);
  });

  it("deleting a non-image attachment drops it from the item", async () => {
    const id = await createItem();
    const upload = await agent
      .post(`/api/timeline/items/${id}/attachments`)
      .attach("file", Buffer.from("hello"), { filename: "notes.txt", contentType: "text/plain" });
    const attachment = upload.body.detail.attachments[0];

    const del = await agent.delete(`/api/timeline/items/${id}/attachments/${attachment.id}`);
    expect(del.status).toBe(200);
    expect(del.body.detail.attachments).toEqual([]);
  });
});
