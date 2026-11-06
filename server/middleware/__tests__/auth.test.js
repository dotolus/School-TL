const { getAdminSession, ADMIN_COOKIE_NAME } = require("../auth");
const { sign } = require("../../services/adminToken");

describe("getAdminSession", () => {
  it("still finds the admin cookie when a neighboring cookie has a malformed % sequence", () => {
    const token = sign({ isAdmin: true }, 1000);
    const req = { headers: { cookie: `some_other=%; ${ADMIN_COOKIE_NAME}=${token}` } };
    expect(getAdminSession(req)).toEqual(expect.objectContaining({ isAdmin: true }));
  });

  it("returns null, without throwing, for an entirely malformed cookie header", () => {
    const req = { headers: { cookie: "some_other=%" } };
    expect(() => getAdminSession(req)).not.toThrow();
    expect(getAdminSession(req)).toBeNull();
  });
});
