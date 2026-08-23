import { createHmac, timingSafeEqual } from "node:crypto";

export const MAX_POSTBACK_BODY_BYTES = 4096;

export class BodyTooLargeError extends Error {}

export function hasValidPostbackSignature(
  reference: string,
  signature: string,
  secret: string,
): boolean {
  if (!/^[a-fA-F0-9]{64}$/.test(signature)) return false;
  const supplied = Buffer.from(signature, "hex");
  const expected = createHmac("sha256", secret).update(reference).digest();
  return timingSafeEqual(supplied, expected);
}

export async function readLimitedPostbackBody(request: Request): Promise<string> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_POSTBACK_BODY_BYTES) {
    throw new BodyTooLargeError();
  }
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_POSTBACK_BODY_BYTES) {
      await reader.cancel();
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}
