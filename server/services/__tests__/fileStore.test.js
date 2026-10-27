const { resourceOptionsForUpload } = require("../fileStore");

describe("fileStore.resourceOptionsForUpload", () => {
  it("sets format: pdf for a PDF, so Cloudinary serves the correct extension/content-type", () => {
    expect(resourceOptionsForUpload("application/pdf", "eq-ppt/item-1")).toEqual({
      folder: "eq-ppt/item-1",
      resource_type: "raw",
      format: "pdf",
    });
  });

  it("sets format: txt for plain text", () => {
    expect(resourceOptionsForUpload("text/plain", "eq-ppt/item-1")).toEqual({
      folder: "eq-ppt/item-1",
      resource_type: "raw",
      format: "txt",
    });
  });

  it("sets format: zip for both zip mimetypes", () => {
    expect(resourceOptionsForUpload("application/zip", "eq-ppt/item-1").format).toBe("zip");
    expect(resourceOptionsForUpload("application/x-zip-compressed", "eq-ppt/item-1").format).toBe("zip");
  });

  it("does not set a format for an image - Cloudinary detects it from the bytes", () => {
    const options = resourceOptionsForUpload("image/png", "eq-ppt/item-1");
    expect(options).toEqual({ folder: "eq-ppt/item-1", resource_type: "image" });
    expect(options.format).toBeUndefined();
  });
});
