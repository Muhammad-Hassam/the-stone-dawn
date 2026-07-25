import axiosClient from "../api/axiosClient";

/**
 * Downloads a file from a protected API route. A plain <a href="..."> tag
 * can't carry the Authorization header, so we fetch the bytes through
 * axiosClient (which attaches the JWT) and trigger the save from a blob.
 */
export async function downloadAuthedFile(path, filename) {
  const res = await axiosClient.get(path, { responseType: "blob" });
  const blobUrl = window.URL.createObjectURL(res.data);

  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename || "download.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(blobUrl);
}
