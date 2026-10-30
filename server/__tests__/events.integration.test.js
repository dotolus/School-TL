const request = require("supertest");
const { createTestApp, cleanupTestApp, datasetPath } = require("./testApp");

let app, tmpDir, agent;

beforeEach(async () => {
  ({ app, tmpDir } = await createTestApp());
  agent = request.agent(app);
  await agent.post("/api/auth/login").send({ password: "test-password" });
});

afterEach(() => {
  cleanupTestApp(tmpDir);
});

describe("GET /api/:school/:period/:class/events", () => {
  it("is public and returns the decoupled public shape", async () => {
    await agent.post(datasetPath("/timeline/items")).send({
      type: "test",
      m: 3,
      y: 2027,
      title: "Math test",
      short: "16.3",
      full: "Tuesday, 16.3.2027",
      detail: { generalInfo: "bring a calculator" },
      "required-white-shirt": true,
      "required-parent-signature": true,
    });

    const res = await request(app).get(datasetPath("/events"));
    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(1);
    const event = res.body.events[0];
    expect(event).toMatchObject({
      type: "test",
      title: "Math test",
      month: 3,
      year: 2027,
      shortDate: "16.3",
      fullDate: "Tuesday, 16.3.2027",
      requiresWhiteShirt: true,
      requiresFood: false,
      requiresParentSignature: true,
      detail: { generalInfo: "bring a calculator" },
    });
    // internal field names must not leak through the public contract
    expect(event.m).toBeUndefined();
    expect(event["required-white-shirt"]).toBeUndefined();
  });
});
