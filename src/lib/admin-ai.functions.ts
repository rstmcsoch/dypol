import { createServerFn } from "@tanstack/react-start";

export type AdminAssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AskAdminAssistantInput = {
  messages: AdminAssistantMessage[];
  token?: string;
};

export type AskAdminAssistantResult = {
  text: string;
};

const MAX_MESSAGES = 24;
const MAX_CONTENT = 8000;

function validateAskInput(data: AskAdminAssistantInput): AskAdminAssistantInput {
  if (!data || !Array.isArray(data.messages) || data.messages.length === 0) {
    throw new Error("A message is required");
  }
  if (data.messages.length > MAX_MESSAGES) {
    throw new Error(`Keep the conversation under ${MAX_MESSAGES} messages`);
  }

  const messages = data.messages.map((m) => {
    if (!m || (m.role !== "user" && m.role !== "assistant")) {
      throw new Error("Each message must be from the user or assistant");
    }
    if (typeof m.content !== "string") throw new Error("Message text is required");
    const content = m.content.trim();
    if (!content) throw new Error("Message text is required");
    if (content.length > MAX_CONTENT) throw new Error("That message is too long");
    return { role: m.role, content };
  });

  if (messages[messages.length - 1]?.role !== "user") {
    throw new Error("The latest message must come from you");
  }

  const token = typeof data.token === "string" ? data.token : undefined;
  return { messages, token };
}

export const askAdminAssistant = createServerFn({ method: "POST" })
  .inputValidator((data: AskAdminAssistantInput) => validateAskInput(data))
  .handler(async ({ data }): Promise<AskAdminAssistantResult> => {
    const { requireAdminFromRequest } = await import("./admin-guard.server");
    await requireAdminFromRequest(data.token);

    const safe = validateAskInput(data);
    const { generateAdminAssistantReply } = await import("./gemini.server");
    const text = await generateAdminAssistantReply(safe.messages);
    return { text };
  });
