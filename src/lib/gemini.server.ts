import { getToken } from "@vercel/connect";

/** Vercel Connect Gemini connector — request credentials only on the server. */
export const GEMINI_CONNECTOR = "generativelanguage.googleapis.com/dypol";

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"] as const;
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM_PROMPT = [
  "You are Dypol's private admin assistant.",
  "Help the site owner with copy, materials, portals, quotes, navigation, Dio, and day-to-day operations.",
  "Be concise, practical, and specific to running this study-companion site.",
  "Never suggest exposing this assistant or Gemini to students or the public site.",
].join(" ");

export type AdminChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export async function getGeminiCredential(): Promise<string> {
  try {
    const token = await getToken(GEMINI_CONNECTOR, {
      subject: { type: "app" },
    });
    if (!token || typeof token !== "string") {
      throw new Error("Gemini credential was empty");
    }
    return token;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not request Gemini credential";
    throw new Error(redactSecrets(msg));
  }
}

function authHeaders(credential: string): Record<string, string> {
  // API keys from AI Studio look like AIza…; Connect OAuth/OIDC tokens do not.
  if (credential.startsWith("AIza") || credential.startsWith("AI")) {
    return { "x-goog-api-key": credential };
  }
  return { Authorization: `Bearer ${credential}` };
}

function redactSecrets(value: string): string {
  return value
    .replace(/AIza[0-9A-Za-z_-]+/g, "[redacted]")
    .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, "[redacted]");
}

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
    error?: { message?: string };
  };
  if (root.error?.message) {
    throw new Error(redactSecrets(root.error.message));
  }
  if (root.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the prompt (${root.promptFeedback.blockReason})`);
  }
  const parts = root.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  return text;
}

async function generateWithModel(
  model: string,
  credential: string,
  messages: AdminChatTurn[],
  fetchImpl: typeof fetch,
): Promise<{ ok: boolean; status: number; text: string; detail: string }> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetchImpl(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(credential),
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });

  const raw = await res.text();
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const detail =
      (parsed && typeof parsed === "object" && "error" in parsed
        ? String((parsed as { error?: { message?: string } }).error?.message ?? raw)
        : raw) || `HTTP ${res.status}`;
    return { ok: false, status: res.status, text: "", detail: redactSecrets(detail) };
  }

  try {
    const text = extractText(parsed);
    if (!text) {
      return { ok: false, status: res.status, text: "", detail: "Gemini returned an empty reply" };
    }
    return { ok: true, status: res.status, text, detail: "" };
  } catch (e) {
    return {
      ok: false,
      status: res.status,
      text: "",
      detail: e instanceof Error ? redactSecrets(e.message) : "Gemini response was unreadable",
    };
  }
}

export async function generateAdminAssistantReply(
  messages: AdminChatTurn[],
  options?: { credential?: string; fetchImpl?: typeof fetch },
): Promise<string> {
  const credential = options?.credential ?? (await getGeminiCredential());
  const fetchImpl = options?.fetchImpl ?? fetch;
  let lastDetail = "Gemini request failed";

  for (const model of GEMINI_MODELS) {
    const result = await generateWithModel(model, credential, messages, fetchImpl);
    if (result.ok) return result.text;
    lastDetail = result.detail;
    // Only fall through when the model id itself is missing.
    if (result.status !== 404) break;
  }

  throw new Error(lastDetail);
}
