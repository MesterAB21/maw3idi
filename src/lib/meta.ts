/**
 * Meta-compatible test webhook (`/test` mode).
 *
 * The real agent lives outside this app (production: maw3idi-agent.onrender.com).
 * To mimic exactly
 * what Meta does, every message POST is signed with the shared app secret:
 *
 *   X-Hub-Signature-256: sha256=<hex hmac_sha256(secret, raw body)>
 *
 * The SAME string is used for signing and as the fetch body — a mismatch
 * (pretty-printing, re-serialization, unicode normalization) fails signature
 * verification on the agent side, just like with Facebook/WhatsApp.
 */

export const META_APP_SECRET =
  process.env.NEXT_PUBLIC_META_APP_SECRET ?? "maw3idi-test-meta-app-secret";

/** The external agent's live Meta-style webhook for `whatsapp_test` /
 *  `instagram_test` inbound messages. Configure via NEXT_PUBLIC_TEST_AGENT_URL. */
export const TEST_AGENT_URL =
  process.env.NEXT_PUBLIC_TEST_AGENT_URL ?? "https://maw3idi-agent.onrender.com/webhooks/test";

export interface TestAgentConfig {
  secret: string;
  agentUrl: string;
}

/** JSON shape served by the backend POST/GET /api/v1/test/meta-config. */
interface TestAgentConfigDto {
  app_secret?: string;
  agent_url?: string;
}

let runtimeConfigPromise: Promise<TestAgentConfig> | null = null;

/** Resolves the current agent config. Prefers the backend's runtime config
 *  (so META_APP_SECRET can be aligned without rebuilding the image), falling
 *  back to the inlined build-time values when the backend is unreachable. */
export function getTestAgentConfig(): Promise<TestAgentConfig> {
  if (!runtimeConfigPromise) {
    runtimeConfigPromise = (async () => {
      try {
        const res = await fetch("/api/v1/test/meta-config", {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as TestAgentConfigDto;
          return {
            secret: data.app_secret ?? META_APP_SECRET,
            agentUrl: data.agent_url ?? TEST_AGENT_URL,
          };
        }
      } catch {
        // backend unreachable → use inlined defaults
      }
      return { secret: META_APP_SECRET, agentUrl: TEST_AGENT_URL };
    })();
  }
  return runtimeConfigPromise;
}

export interface AgentMessageInput {
  /** Inbound phone number of the patient (E.164, digits only). */
  from: string;
  /** Contact display name, e.g. "Karim Benzema". */
  name: string;
  /** Message body. */
  body: string;
  /** Unique WhatsApp message id, e.g. "wamid.demo.1". */
  messageId?: string;
  /** Account phone number of the clinic (channel_identifier of whatsapp_test). */
  displayPhoneNumber: string;
}

export interface AgentReply {
  status: string;
  reply?: string;
  channel?: string;
  thread_id?: string;
  reason?: string;
}

export interface OutboundChannel {
  channel_type: string;
  channel_identifier: string;
}

export function buildWhatsAppPayload(input: AgentMessageInput): object {
  const { from, name, body, displayPhoneNumber } = input;
  return {
    object: "whatsapp_test",
    entry: [
      {
        id: "entry_1",
        changes: [
          {
            value: {
              metadata: {
                display_phone_number: displayPhoneNumber,
                phone_number_id: "1",
              },
              contacts: [{ profile: { name } }],
              messages: [
                {
                  from,
                  id: input.messageId ?? `wamid.demo.${Date.now()}`,
                  type: "text",
                  text: { body },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

export function buildInstagramPayload(input: AgentMessageInput): object {
  const { from, name, body } = input;
  return {
    object: "instagram_test",
    entry: [
      {
        // entry[0].id is the Instagram professional account id — this is what
        // identifies the cabinet on the agent side (channel_identifier).
        id: input.displayPhoneNumber,
        changes: [
          {
            value: {
              metadata: { ig_account_id: input.displayPhoneNumber },
              contacts: [{ profile: { name } }],
              messages: [
                {
                  from,
                  id: input.messageId ?? `igid.demo.${Date.now()}`,
                  type: "text",
                  text: { body },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  return hmacHex("SHA-256", secret, message);
}

async function hmacSha1Hex(secret: string, message: string): Promise<string> {
  return hmacHex("SHA-1", secret, message);
}

async function hmacHex(
  hash: "SHA-256" | "SHA-1",
  secret: string,
  message: string
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface SendResult {
  ok: boolean;
  reply: string;
  channel?: string;
  threadId?: string;
  ignored?: boolean;
  reason?: string;
}

/** POSTs a Meta-formatted payload to the live agent with the signature header,
 *  exactly as Facebook would. Returns the agent's dictated reply. */
export async function signAndPost(
  payload: object,
  config?: TestAgentConfig
): Promise<AgentReply> {
  const { secret, agentUrl } = config ?? (await getTestAgentConfig());
  const body = JSON.stringify(payload);
  const signature = await hmacSha256Hex(secret, body);
  const signatureSha1 = await hmacSha1Hex(secret, body);
  const res = await fetch(agentUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature": `sha1=${signatureSha1}`,
      "X-Hub-Signature-256": `sha256=${signature}`,
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Agent webhook HTTP ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as AgentReply;
}

export async function sendMessageToAgent(
  input: AgentMessageInput
): Promise<AgentReply> {
  const payload =
    input.displayPhoneNumber.startsWith("178")
      ? buildInstagramPayload(input)
      : buildWhatsAppPayload(input);
  return signAndPost(payload);
}

export function toSendResult(reply: AgentReply): SendResult {
  if (reply.status === "ignored") {
    return {
      ok: false,
      reply: reply.reason ?? "Message ignoré",
      channel: reply.channel,
      ignored: true,
      reason: reply.reason,
    };
  }
  return {
    ok: true,
    reply: reply.reply ?? "",
    channel: reply.channel,
    threadId: reply.thread_id,
  };
}