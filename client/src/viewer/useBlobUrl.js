import { useEffect, useMemo } from "react";

function dataUriToBlobUrl(dataUri) {
  const commaIndex = dataUri.indexOf(",");
  const mimeType = dataUri.slice(5, commaIndex).split(";")[0] || "application/octet-stream";
  const binary = atob(dataUri.slice(commaIndex + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

// Chrome's PDF viewer refuses to render a data: URI inside an <iframe> (it
// silently downloads instead, with a generated filename that has no
// extension and drops any non-ASCII characters) - and <a download> is also
// unreliable for data: URIs with a non-ASCII filename. Both only ever come
// up with fileStore.js's dev/CI data-URI fallback (a real Cloudinary url is
// unaffected and passed through as-is); converting to a same-origin Blob
// object URL first fixes both.
export function useBlobUrl(url) {
  const blobUrl = useMemo(() => (url && url.startsWith("data:") ? dataUriToBlobUrl(url) : null), [url]);
  useEffect(() => () => blobUrl && URL.revokeObjectURL(blobUrl), [blobUrl]);
  return blobUrl || url;
}
