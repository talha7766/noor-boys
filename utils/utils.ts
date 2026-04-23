import * as FileSystemLegacy from "expo-file-system/legacy";

// -------------------- UTILITY --------------------
export function bufferToBase64(buffer: number[]) {
  const CHUNK_SIZE = 0x8000;
  let binary = "";
  for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
    const chunk = buffer.slice(i, i + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
export const convertBlobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const result = reader.result;

      // TS fix: ensure it's a string
      if (typeof result === "string") {
        const base64 = result.split(",")[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert blob: result is not a string"));
      }
    };

    reader.onerror = () => reject(reader.error);

    reader.readAsDataURL(blob);
  });
};

export const downloadWithValidation = async (
  url: string,
  localUri: string,
  headers: Record<string, string>,
  maxRetries = 3
): Promise<string> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Download attempt ${attempt}`);

    await FileSystemLegacy.deleteAsync(localUri, { idempotent: true });

    const result = await FileSystemLegacy.downloadAsync(url, localUri, {
      headers,
    });

    if (result.status !== 200) {
      console.warn("HTTP error:", result.status);
      continue;
    }

    const expectedSize = Number(
      result.headers?.["x-file-size"] || result.headers?.["X-File-Size"]
    );

    if (!expectedSize) {
      console.warn("Missing file size header, trusting download");
      return localUri;
    }

    const fileInfo = await FileSystemLegacy.getInfoAsync(localUri);

    if (!fileInfo.exists) continue;
    if (fileInfo.size !== expectedSize) {
      console.warn(
        `Size mismatch: expected ${expectedSize}, got ${fileInfo.size}`
      );
      continue;
    }

    console.log("File validated successfully");
    return localUri;
  }

  throw new Error("File download failed after retries");
};
