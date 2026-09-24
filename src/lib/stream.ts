/**
 * Voix en direct (mode /test) — accord avec le Voice Gateway
 * (production: maw3idi-agent-7z4f.onrender.com).
 *
 * Le même secret partagé que le webhook signe le corps JSON du POST /stream/test :
 *
 *   X-Hub-Signature-256: sha256=<hex hmac_sha256(secret, raw body)>
 *
 * Seul un appel correctement signé fournit le token (unique, TTL 120 s) qui donne
 * accès au WebSocket /stream/ws (le navigateur ne peut pas mettre de header custom
 * dans un WebSocket, donc impossible d'y accéder autrement).
 */

import { getTestAgentConfig, hmacSha256Hex } from "./meta";

export interface StartCallPayload {
  call_id: string;
  from: string;
  to: string;
  ts: string;
  channel?: string;
}

export interface StartCallResponse {
  status: string;
  call_id: string;
  channel: string;
  token: string;
  ws_url: string;
}

export type CallTurn = { role: "user" | "assistant"; text: string };
export type CallAction = { tool: string; args: unknown; result: unknown };
export interface CallSummary {
  reason?: string;
  patient_request?: string;
  appointment_action?: string | null;
  appointment_date?: string | null;
  appointment_time?: string | null;
  status?: string;
  follow_up_needed?: boolean;
}

export interface CallEndFrame {
  type: "call.end";
  call_id: string;
  status: string;
  channel: string;
  transcript?: CallTurn[];
  actions?: CallAction[];
  summary?: CallSummary;
}

export interface CallErrorFrame {
  type: "call.error";
  reason?: string;
}

export type CallFrame = CallEndFrame | CallErrorFrame;

export type StartCallResult =
  | { ok: true; session: StartCallResponse }
  | { ok: false; status: number; message: string };

/** Dérive la base HTTP + WS du gateway à partir de l'URL du webhook. */
export function agentBases(agentUrl: string): { httpBase: string; wsBase: string } {
  const base = agentUrl.replace(/\/webhooks\/test\/?$/, "");
  const httpBase = base.replace(/\/$/, "");
  const u = new URL(httpBase);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  const wsBase = u.href.replace(/\/$/, "");
  return { httpBase, wsBase };
}

/** URL WebSocket complète à partir du `ws_url` renvoyé par /stream/test. */
export function buildWsUrl(wsUrl: string, agentUrl: string): string {
  return `${agentBases(agentUrl).wsBase}${wsUrl}`;
}

/** POST signé sur /stream/test comme le ferait un vrai passerelle téléphonique. */
export async function startVoiceCall(payload: StartCallPayload): Promise<StartCallResult> {
  const config = await getTestAgentConfig();
  const { httpBase } = agentBases(config.agentUrl);
  const body = JSON.stringify(payload);
  const signature = await hmacSha256Hex(config.secret, body);
  const res = await fetch(`${httpBase}/stream/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": `sha256=${signature}`,
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, message: text || res.statusText };
  }
  const data = (await res.json()) as StartCallResponse;
  return { ok: true, session: data };
}