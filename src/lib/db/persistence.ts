import { get, put } from "@vercel/blob";

const BLOB_PATHNAME = "bistrot-platform.json";

/** Vercel Blob when a store is connected or a token is present. */
export function useBlobStorage(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.BLOB_STORE_ID ||
      process.env.VERCEL
  );
}

function rethrowBlobConfigError(error: unknown): never {
  const detail = error instanceof Error ? error.message : String(error);
  throw new Error(
    `Stockage persistant indisponible (${detail}). Dans Vercel : Storage → Create Database → Blob (accès Private), connectez le store au projet, puis redéployez.`
  );
}

export async function readBlobJson(): Promise<string | null> {
  try {
    const result = await get(BLOB_PATHNAME, {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    return text.trim() ? text : null;
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const message = error instanceof Error ? error.message : String(error);
    if (
      name.includes("NotFound") ||
      /not found|404/i.test(message)
    ) {
      return null;
    }
    rethrowBlobConfigError(error);
  }
}

export async function writeBlobJson(content: string): Promise<void> {
  try {
    await put(BLOB_PATHNAME, content, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  } catch (error) {
    rethrowBlobConfigError(error);
  }
}
