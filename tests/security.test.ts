import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createHmac } from "node:crypto";

import {
  BodyTooLargeError,
  hasValidPostbackSignature,
  readLimitedPostbackBody,
} from "../src/lib/dio-postback.server.ts";
import {
  fetchLinkMeta,
  isPublicIpAddress,
  parsePublicHttpUrl,
} from "../src/lib/link-meta.server.ts";
import { withSecurityHeaders } from "../src/lib/security-headers.ts";

test("SSRF address filter permits public IPs", () => {
  assert.equal(isPublicIpAddress("8.8.8.8"), true);
  assert.equal(isPublicIpAddress("1.1.1.1"), true);
  assert.equal(isPublicIpAddress("2606:4700:4700::1111"), true);
});

test("SSRF address filter blocks local, private, reserved, and transition ranges", () => {
  for (const address of [
    "0.0.0.0",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "198.18.0.1",
    "224.0.0.1",
    "::",
    "::1",
    "::ffff:7f00:1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "2002:0808:0808::1",
  ]) {
    assert.equal(isPublicIpAddress(address), false, address);
  }
});

test("URL parser accepts normal web URLs and rejects SSRF primitives", () => {
  assert.equal(parsePublicHttpUrl("https://example.com/path").hostname, "example.com");
  for (const target of [
    "file:///etc/passwd",
    "http://user:pass@example.com/",
    "https://example.com:8443/",
    "http://localhost/",
    "http://service.internal/",
    "http://127.0.0.1/",
    "http://2130706433/",
    "http://[::1]/",
  ]) {
    assert.throws(() => parsePublicHttpUrl(target), undefined, target);
  }
});

test("metadata fetch rejects a loopback target before connecting", async () => {
  await assert.rejects(fetchLinkMeta("http://127.0.0.1/"), /Target host is not allowed/);
});

test("security headers preserve route headers and harden the response", async () => {
  const response = withSecurityHeaders(
    new Response("ok", {
      status: 202,
      headers: { "cache-control": "no-store", "content-type": "text/plain" },
    }),
  );

  assert.equal(response.status, 202);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.equal(await response.text(), "ok");
});

test("an existing route CSP is not overwritten", () => {
  const response = withSecurityHeaders(
    new Response(null, { headers: { "content-security-policy": "default-src 'none'" } }),
  );
  assert.equal(response.headers.get("content-security-policy"), "default-src 'none'");
});

test("postback HMAC verification accepts only a complete SHA-256 signature", () => {
  const reference = "test_reference";
  const secret = "test-only-secret";
  const signature = createHmac("sha256", secret).update(reference).digest("hex");
  assert.equal(hasValidPostbackSignature(reference, signature, secret), true);
  assert.equal(hasValidPostbackSignature(reference, signature.toUpperCase(), secret), true);
  assert.equal(hasValidPostbackSignature(reference, `${signature}00`, secret), false);
  assert.equal(hasValidPostbackSignature(reference, "not-hex", secret), false);
});

test("postback body reader rejects oversized payloads", async () => {
  const request = new Request("https://example.com/postback", {
    method: "POST",
    body: "x".repeat(5000),
  });
  await assert.rejects(readLimitedPostbackBody(request), BodyTooLargeError);
});

test("resource-link migration uses invoker views and revokes base link reads", async () => {
  const sql = await readFile(
    new URL(
      "../supabase/migrations/20260823000000_protect_gated_resource_links.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(sql, /security_invoker = true/g);
  assert.match(sql, /REVOKE SELECT ON public\.materials FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /REVOKE SELECT ON public\.portals FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.catalog_resource_access/);
  assert.doesNotMatch(sql, /GRANT SELECT \([^)]*\blink\b[^)]*\)/s);
});

test("Dio unlock migration preserves account gates and admin revocations", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20260823000500_harden_dio_unlock.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /public\.user_is_blocked\(_uid\)/);
  assert.match(sql, /public\.user_is_onboarded\(_uid\)/);
  assert.match(sql, /ACCESS_REVOKED/);
  assert.match(sql, /RESOURCE_UNAVAILABLE/);
  assert.doesNotMatch(sql, /SET\s+status\s*=\s*'active'/i);
});

test("user-content migration binds identities and serializes rate limits", async () => {
  const sql = await readFile(
    new URL(
      "../supabase/migrations/20260823001000_harden_user_generated_content.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(sql, /NEW\.user_id := _uid/);
  assert.match(sql, /NEW\.user_email := COALESCE/);
  assert.match(sql, /NEW\.status := 'pending'/);
  assert.match(sql, /pg_advisory_xact_lock/g);
  assert.match(sql, /DROP POLICY IF EXISTS "Users insert own notifications"/);
});
