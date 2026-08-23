import { createFileRoute } from "@tanstack/react-router";
import {
  BodyTooLargeError,
  hasValidPostbackSignature,
  readLimitedPostbackBody,
} from "@/lib/dio-postback.server";

/**
 * Server-to-server ad completion postback.
 *
 * The provider must call:
 *   POST /api/public/dio/ad-postback
 *   body: { "reference": "<ref>", "signature": "<hex hmac-sha256 of reference>" }
 * signed with the shared secret DIO_AD_POSTBACK_SECRET.
 *
 * A frontend "completed=true" is never trusted: Dio is only credited here or
 * by an admin approving a completion. Awarding is idempotent — replaying the
 * same reference credits nothing extra.
 */
export const Route = createFileRoute("/api/public/dio/ad-postback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["DIO_AD_POSTBACK_SECRET"];
        if (!secret) {
          return json({ ok: false, error: "postback_not_configured" }, 503);
        }

        let body: { reference?: unknown; signature?: unknown };
        try {
          body = JSON.parse(await readLimitedPostbackBody(request)) as typeof body;
        } catch (error) {
          if (error instanceof BodyTooLargeError) {
            return json({ ok: false, error: "payload_too_large" }, 413);
          }
          return json({ ok: false, error: "invalid_json" }, 400);
        }

        const reference = typeof body.reference === "string" ? body.reference.trim() : "";
        const signature =
          typeof body.signature === "string"
            ? body.signature.trim()
            : (request.headers.get("x-dio-signature") ?? "").trim();

        if (!reference || reference.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(reference)) {
          return json({ ok: false, error: "invalid_reference" }, 400);
        }
        if (!signature) return json({ ok: false, error: "missing_signature" }, 401);
        if (!hasValidPostbackSignature(reference, signature, secret)) {
          return json({ ok: false, error: "invalid_signature" }, 401);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("dio_ad_award", { _reference: reference });
        if (error) {
          console.error("[dio] award failed", error.message);
          return json({ ok: false, error: "award_failed" }, 500);
        }
        const result = (data ?? {}) as { ok?: boolean; error?: string; duplicate?: boolean };
        if (!result.ok) return json({ ok: false, error: result.error ?? "rejected" }, 409);
        return json({ ok: true, duplicate: !!result.duplicate });
      },
    },
  },
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}
