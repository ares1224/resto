import { get, put } from "@vercel/blob";

const BLOB_PATHNAME = "bistrot-platform.json";

/** Use Blob only when the store is actually connected. */
export function useBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export async function readBlobJson(): Promise<string | null> {
  if (!useBlobStorage()) return null;
  try {
    const result = await get(BLOB_PATHNAME, {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    return text.trim() ? text : null;
  } catch (error) {
    console.error("Blob storage error:", error);
    return null;
  }
}

export async function writeBlobJson(content: string): Promise<boolean> {
  if (!useBlobStorage()) return false;
  try {
    await put(BLOB_PATHNAME, content, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return true;
  } catch (error) {
    console.error("Blob storage error:", error);
    return false;
  }
}
