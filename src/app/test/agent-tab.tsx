"use client";

import * as React from "react";
import { useState } from "react";
import {
  Phone,
  MessageSquare,
  MicOff,
  Volume2,
  Mic2,
  Sparkles,
  ArrowUp,
  Lock,
  Check,
  ChevronDown,
  Plus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useTestSession } from "./test-session";
import { getTestAgentConfig, sendMessageToAgent, toSendResult } from "@/lib/meta";
import { buildWsUrl, startVoiceCall, type CallEndFrame, type CallFrame } from "@/lib/stream";
import { VoiceBridge, type BridgeStatus } from "@/lib/voice-bridge";

interface ChatMessage {
  id: string;
  from: "patient" | "agent";
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
}

interface TestConversation {
  id: string;
  channel: "call_test" | "whatsapp_test" | "instagram_test";
  contactId: string;
}

type TestChannelKey = "call" | "whatsapp_test" | "instagram_test";

const TEST_CHANNELS: Array<TestConversation["channel"]> = [
  "call_test",
  "whatsapp_test",
  "instagram_test",
];

/** Génère un numéro algérien test (213 + 9 chiffres), jamais rattaché à un
 *  patient existant. Le mode test ne doit pas utiliser les contact_ids
 *  réels : l'agent doit voir un patient inconnu (pas de dossier récupéré). */
function randomContactId(used: Set<string>): string {
  let id = "";
  do {
    id = `213${Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("")}`;
  } while (used.has(id));
  used.add(id);
  return id;
}

interface ChannelAccent {
  text: string;
  soft: string;
  solid: string;
  grad: string;
  hex: string;
}

const ACCENTS: Record<"whatsapp_test" | "instagram_test", ChannelAccent> = {
  whatsapp_test: {
    text: "text-green-600",
    soft: "bg-green-50",
    solid: "bg-[#25D366]",
    grad: "bg-gradient-to-br from-[#25D366] to-[#128C7E]",
    hex: "#25D366",
  },
  instagram_test: {
    text: "text-pink-600",
    soft: "bg-pink-50",
    solid: "bg-pink-600",
    grad: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
    hex: "#ec4899",
  },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")
  ).toUpperCase() || "MA";
}

function VoiceBars({ active }: { active: boolean }) {
  return (
    <div className="flex h-8 items-center gap-1" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className={cn(
            "w-1 rounded-full",
            active ? "mwr-bar bg-blue-500" : "h-2 bg-blue-200/70 opacity-70"
          )}
          style={active ? { animationDelay: `${i * 110}ms` } : undefined}
        />
      ))}
    </div>
  );
}

function formatContact(contactId: string): string {
  return `+${contactId.replace(/^(\d{3})(\d{2})(\d{3})(\d{4})$/, "$1 $2 $3 $4")}`;
}

function ConversationPicker({
  conversations,
  selectedId,
  onSelect,
  onAdd,
  disabled = false,
}: {
  conversations: TestConversation[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex max-w-[180px] items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-50",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span className="truncate font-mono">
          {selected ? formatContact(selected.contactId) : "Discussion"}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
          <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Discussions
          </p>
          <div className="max-h-64 overflow-y-auto">
            {conversations.map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelect(c.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors",
                    active ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" />}
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                  <span className="truncate font-mono text-xs">{formatContact(c.contactId)}</span>
                </button>
              );
            })}
            {conversations.length === 0 && (
              <p className="px-2 py-2 text-xs text-gray-400">Aucune discussion.</p>
            )}
          </div>
          <div className="mt-1 border-t border-gray-100 pt-1">
            <button
              type="button"
              onClick={() => {
                onAdd();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Nouvelle discussion
            </button>
            <p className="px-2 pb-1 text-[10px] text-gray-400">
              Nouveau numéro aléatoire — patient inconnu pour l'agent.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function CallTab({
  conversations,
  selectedId,
  onSelectConversation,
  onAddConversation,
}: {
  conversations: TestConversation[];
  selectedId: string;
  onSelectConversation: (id: string) => void;
  onAddConversation: () => void;
}) {
  const session = useTestSession();
  const callChannel = session.channels.find((c) => c.channel_type === "call_test");
  const agentName = session.agentName || "Agent";
  const conversation = conversations.find((c) => c.id === selectedId) ?? conversations[0];
  const fromNumber = conversation?.contactId ?? "";
  const [callState, setCallState] = useState<"idle" | "ringing" | "active" | "ended">("idle");
  const [callError, setCallError] = useState<string | null>(null);
  const [finalFrame, setFinalFrame] = useState<CallEndFrame | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [micLevel, setMicLevel] = useState(0);
  const bridgeRef = React.useRef<VoiceBridge | null>(null);
  const stopRingRef = React.useRef<(() => void) | null>(null);
  const ringTimeoutRef = React.useRef<number | null>(null);

  const stopRing = React.useCallback(() => {
    if (ringTimeoutRef.current !== null) {
      window.clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    if (stopRingRef.current) {
      stopRingRef.current();
      stopRingRef.current = null;
    }
  }, []);

  const startRing = React.useCallback(() => {
    stopRing();
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
    } catch {
      // Context indisponible → on sonne visuellement seulement.
    }
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 425;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    let timer: number | null = null;
    let stopped = false;
    const schedule = (on: boolean) => {
      if (stopped) return;
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(on ? 0.22 : 0, t + 0.03);
      timer = window.setTimeout(() => schedule(!on), on ? 1500 : 2500);
    };
    schedule(true);
    stopRingRef.current = () => {
      if (stopped) return;
      stopped = true;
      if (timer !== null) window.clearTimeout(timer);
      try {
        osc.stop();
      } catch {
        // déjà arrêté
      }
      void ctx!.close().catch(() => undefined);
      stopRingRef.current = null;
    };
  }, [stopRing]);

  React.useEffect(() => {
    return () => {
      const b = bridgeRef.current;
      if (b) void b.end();
      stopRing();
    };
  }, [stopRing]);

  React.useEffect(() => {
    if (callState !== "active") {
      setElapsed(0);
      return;
    }
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [callState]);

  const onStatus = React.useCallback(
    (status: BridgeStatus, detail?: string) => {
      if (status === "connecting") {
        setCallState("ringing");
      } else if (status === "active") {
        stopRing();
        setCallState("active");
      } else if (status === "ended") {
        stopRing();
        setCallState("ended");
        if (detail) setCallError(detail);
      } else if (status === "error") {
        stopRing();
        setCallState("ended");
        setCallError(detail ?? "Erreur pendant l'appel.");
      }
    },
    [stopRing]
  );

  const onFrame = React.useCallback((frame: CallFrame) => {
    if (frame.type === "call.end") setFinalFrame(frame);
    else if (frame.type === "call.error") setCallError(frame.reason ?? "Erreur de l'appel.");
  }, []);

  const startCall = async () => {
    if (!callChannel) {
      setCallError("Canal « call_test » non configuré pour ce cabinet test.");
      setCallState("ended");
      return;
    }
    setCallError(null);
    setFinalFrame(null);
    setMicLevel(0);
    setMuted(false);
    setCallState("ringing");
    startRing();
    ringTimeoutRef.current = window.setTimeout(() => {
      stopRing();
      setCallError("Pas de réponse — le cabinet n'a pas décroché.");
      setCallState("ended");
    }, 45000);
    const callId = `call_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`;
    try {
      const result = await startVoiceCall({
        call_id: callId,
        from: fromNumber,
        to: callChannel.channel_identifier,
        ts: new Date().toISOString(),
        channel: "call_test",
      });
      if (!result.ok) {
        stopRing();
        const msg =
          result.status === 401 || result.status === 403
            ? `Signature refusée (HTTP ${result.status}).`
            : result.status === 404
              ? "Cabinet introuvable pour ce numéro (404)."
              : `Échec du démarrage (HTTP ${result.status}).`;
        setCallError(msg);
        setCallState("ended");
        return;
      }
      const cfg = await getTestAgentConfig();
      const bridge = new VoiceBridge({ onStatus, onFrame, onLevel: setMicLevel });
      bridge.setMuted(false); // micro OUVERT par défaut à chaque appel
      bridge.setOutputMuted(!speakerOn);
      bridgeRef.current = bridge;
      await bridge.connect(buildWsUrl(result.session.ws_url, cfg.agentUrl));
    } catch (err) {
      stopRing();
      setCallError(err instanceof Error ? err.message : "Appel impossible.");
      setCallState("ended");
    }
  };

  const endCall = async () => {
    stopRing();
    setMicLevel(0);
    const b = bridgeRef.current;
    bridgeRef.current = null;
    if (b) await b.end();
    setCallState("ended");
  };

  const toggleMuted = (v: boolean) => {
    setMuted(v);
    bridgeRef.current?.setMuted(v);
  };
  const toggleSpeaker = (v: boolean) => {
    setSpeakerOn(v);
    bridgeRef.current?.setOutputMuted(!v);
  };

  const inCall = callState === "ringing" || callState === "active";
  const isMuted = muted;
  const formatTimer = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const pill =
    callState === "ringing"
      ? { label: "Sonnerie…", cls: "bg-amber-50 text-amber-600" }
      : callState === "active"
        ? { label: "En appel", cls: "bg-blue-50 text-blue-600" }
        : callState === "ended"
          ? {
              label: callError ? "Erreur" : "Appel terminé",
              cls: callError ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500",
            }
          : { label: "Prêt à appeler", cls: "bg-gray-100 text-gray-500" };

  const statusText =
    callState === "ringing"
      ? "Appel en cours — le cabinet sonne, patientez…"
      : callState === "active"
        ? "Écoute en cours…"
        : callError
          ? callError
          : finalFrame?.summary?.reason
            ? finalFrame.summary.reason
            : finalFrame
              ? "Appel terminé — transcription réelle ci-dessous."
              : " ";

  const transcript = finalFrame?.transcript ?? [];

  return (
    <div className="flex flex-1 flex-col h-full">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Phone className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">Appel vocal IA</p>
          <span className="text-[11px] text-gray-500">Agent : {agentName}</span>
          {callChannel && (
            <span className="mt-0.5 ml-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-mono text-gray-500">
              {callChannel.channel_identifier}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
          <ConversationPicker
            conversations={conversations}
            selectedId={conversation?.id ?? ""}
            onSelect={onSelectConversation}
            onAdd={onAddConversation}
            disabled={inCall}
          />
          <span className={cn("h-1.5 w-1.5 rounded-full", inCall ? "bg-green-500" : "bg-gray-300")} />
          <span>{inCall ? "En ligne" : "Hors ligne"}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
        <div className="mx-auto flex h-full max-w-[420px] flex-col items-center justify-center px-6 py-10">
          <div className="relative mb-6 flex items-center justify-center" aria-hidden="true">
            {inCall && (
              <>
                <span
                  className="mwr-ring absolute rounded-full border-2 border-blue-400/40"
                  style={{ width: 168, height: 168 }}
                />
                <span
                  className="mwr-ring absolute rounded-full border-blue-400/25 border-2"
                  style={{ width: 168, height: 168, animationDelay: "1s" }}
                />
              </>
            )}
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-2xl font-semibold text-white shadow-lg">
              {initials(agentName)}
            </div>
          </div>

          <h3 className="text-xl font-semibold text-gray-900">{agentName}</h3>
          <p className="mt-1 text-sm text-gray-500 tabular-nums">
            {callChannel?.channel_identifier ?? "Ligne d'appel indisponible"}
          </p>
          {callState === "active" && (
            <p className="mt-1 text-sm text-gray-500 tabular-nums" aria-live="off">
              {formatTimer(elapsed)}
            </p>
          )}

          <div className="mt-6 flex flex-col items-center gap-3">
            <span className={cn("rounded-full px-3 py-1 text-xs font-medium", pill.cls)}>{pill.label}</span>
            <VoiceBars active={callState === "active"} />
            {callState === "active" && (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <Mic2 className="h-3 w-3" />
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-150 ease-linear",
                      micLevel >= 0.3 ? "bg-green-500" : "bg-blue-400"
                    )}
                    style={{ width: `${Math.max(4, Math.round(micLevel * 100))}%` }}
                  />
                </div>
                <span>{isMuted ? "coupé" : "micro"}</span>
              </div>
            )}
          </div>

          <div aria-live="polite" className="mt-5 flex min-h-[48px] items-center justify-center">
            <p key={statusText} className="mwr-fade text-center text-[15px] leading-relaxed text-gray-700">
              {statusText}
            </p>
          </div>

          {transcript.length > 0 && !inCall && (
            <div className="mt-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm">
              <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                <MessageSquare className="h-3.5 w-3.5" />
                Transcription réelle
              </p>
              <ul className="max-h-56 space-y-2 overflow-y-auto">
                {transcript.map((turn, i) => (
                  <li key={i} className={cn("flex gap-2 text-xs leading-relaxed", turn.role === "user" ? "justify-end" : "justify-start")}>
                    {turn.role !== "user" && (
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-600">
                        IA
                      </span>
                    )}
                    <span
                      className={cn(
                        "rounded-xl px-2.5 py-1.5",
                        turn.role === "user" ? "bg-blue-50 text-blue-800" : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {turn.text}
                    </span>
                    {turn.role === "user" && (
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[9px] font-bold text-gray-500">
                        PA
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {finalFrame && (
            <CallResult frame={finalFrame} />
          )}

          <div className="mt-8 flex items-start justify-center gap-6">
            {!inCall && (callState === "idle" || callState === "ended") ? (
              <div className="flex flex-col items-center gap-2">
                <button
                  aria-label="Démarrer l'appel"
                  onClick={() => void startCall()}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_8px_24px_rgba(59,130,246,0.35)] transition-transform duration-200 ease-out hover:scale-105 active:scale-95"
                >
                  <Phone className="h-6 w-6" />
                </button>
                <span className="text-xs text-gray-500">
                  {callState === "ended" ? "Rappeler" : "Démarrer l'appel"}
                </span>
              </div>
            ) : (
              <>
                {callState === "active" && (
                  <>
                    <div className="flex flex-col items-center gap-2">
                      <button
                        aria-label={isMuted ? "Réactiver le micro" : "Couper le micro"}
                        onClick={() => toggleMuted(!isMuted)}
                        className={cn(
                          "flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 ease-out hover:scale-105 active:scale-95",
                          isMuted
                            ? "bg-red-50 text-red-600"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic2 className="h-5 w-5" />}
                      </button>
                      <span className="text-xs text-gray-500">{isMuted ? "Micro coupé" : "Micro"}</span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <button
                        aria-label={speakerOn ? "Couper le haut-parleur" : "Activer le haut-parleur"}
                        onClick={() => toggleSpeaker(!speakerOn)}
                        className={cn(
                          "flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 ease-out hover:scale-105 active:scale-95",
                          speakerOn
                            ? "bg-blue-50 text-blue-600"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        <Volume2 className="h-5 w-5" />
                      </button>
                      <span className="text-xs text-gray-500">Haut-parleur</span>
                    </div>
                  </>
                )}

                <div className="flex flex-col items-center gap-2">
                  <button
                    aria-label="Raccrocher"
                    onClick={() => void endCall()}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_8px_24px_rgba(239,68,68,0.35)] transition-transform duration-200 ease-out hover:scale-105 active:scale-95"
                  >
                    <Phone className="h-6 w-6 rotate-[135deg]" />
                  </button>
                  <span className="text-xs text-gray-500">{callState === "ringing" ? "Annuler" : "Raccrocher"}</span>
                </div>
              </>
            )}
          </div>

            <div className="mt-8 w-full max-w-xs space-y-2 rounded-xl bg-white p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Paramètres de l'appel test</p>
            <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
              <span>Numéro patient (from)</span>
              <span className="w-40 truncate rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-right font-mono text-xs text-gray-700" dir="ltr">
                {fromNumber || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
              <span>Canal</span>
              <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-xs text-gray-700">
                call_test
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Appel réel : /stream/test signé → gateway voix (Gemini Live) → tools MAW3IDI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CallResult({ frame }: { frame: CallEndFrame }) {
  const summary = frame.summary;
  return (
    <div className="mt-5 w-full rounded-xl border border-blue-100 bg-white p-4 text-left shadow-sm">
      <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-blue-600">
        <MessageSquare className="h-3.5 w-3.5" />
        Règlement de l'appel
      </p>
      {summary && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {(
            [
              ["Action", summary.appointment_action ?? "null"],
              ["Date", summary.appointment_date ?? "—"],
              ["Heure", summary.appointment_time ?? "—"],
              ["Suivi", summary.follow_up_needed ? "Oui" : "Non"],
            ] as Array<[string, string]>
          ).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 border-b border-dotted border-gray-200 pb-1">
              <dt className="text-gray-400">{k}</dt>
              <dd className="font-medium text-gray-800">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {frame.actions && frame.actions.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {frame.actions.map((a, i) => (
            <li key={i} className="rounded-md bg-gray-50 px-2 py-1.5 text-[11px] text-gray-600">
              <span className="font-mono font-semibold text-blue-600">{a.tool}</span> · {JSON.stringify(a.args)}
            </li>
          ))}
        </ul>
      )}
      {frame.transcript && frame.transcript.length > 0 && (
        <p className="mt-3 text-[10px] text-gray-400">
          Transcription complète affichée ci-dessus.
        </p>
      )}
      <pre className="mt-3 max-h-32 overflow-auto rounded-md bg-gray-50 p-2 text-[10px] text-gray-500">
        {JSON.stringify(frame, null, 2)}
      </pre>
    </div>
  );
}

function MessageTab({
  channelType,
  conversations,
  selectedId,
  onSelectConversation,
  onAddConversation,
}: {
  channelType: "whatsapp_test" | "instagram_test";
  conversations: TestConversation[];
  selectedId: string;
  onSelectConversation: (id: string) => void;
  onAddConversation: () => void;
}) {
  const session = useTestSession();
  const channel = session.channels.find((c) => c.channel_type === channelType);
  const conversation = conversations.find((c) => c.id === selectedId) ?? conversations[0];
  const from = conversation?.contactId ?? "";

  const STORAGE_KEY = `maw3idi:test:conversations:${session.cabinetId}`;
  const conKey = conversation ? `${channelType}:${conversation.id}` : channelType;

  const [messagesByKey, setMessagesByKey] = useState<Record<string, ChatMessage[]>>(() => {
    let stored: Record<string, ChatMessage[]> | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (raw) stored = JSON.parse(raw) as Record<string, ChatMessage[]>;
      } catch {
        stored = null;
      }
    }
    const merged: Record<string, ChatMessage[]> =
      stored && typeof stored === "object" ? { ...stored } : {};
    if (!Array.isArray(merged[conKey])) merged[conKey] = [];
    return merged;
  });
  const [newMessage, setNewMessage] = useState("");
  const [waitingReply, setWaitingReply] = useState(false);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messagesByKey));
      }
    } catch {
      // stockage indisponible → on ne casse pas la conversation
    }
  }, [STORAGE_KEY, messagesByKey]);

  const messages: ChatMessage[] = React.useMemo(
    () => messagesByKey[conKey] ?? [],
    [messagesByKey, conKey]
  );
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  React.useEffect(() => {
    scrollToBottom();
  }, [messages, waitingReply]);

  const append = (msg: ChatMessage) => {
    setMessagesByKey((prev) => ({
      ...prev,
      [conKey]: [...(prev[conKey] ?? []), msg],
    }));
  };

  const now = () =>
    new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const sendMessage = async () => {
    if (!newMessage.trim() || waitingReply) return;
    if (!channel) {
      append({
        id: `err-${Date.now()}`,
        from: "agent",
        text: "Canal non configuré pour ce cabinet test.",
        time: now(),
        status: "read",
      });
      return;
    }
    const text = newMessage;
    append({ id: `p-${Date.now()}`, from: "patient", text, time: now(), status: "read" });
    setNewMessage("");
    setWaitingReply(true);
    try {
      const reply = await sendMessageToAgent({
        from,
        name: "Patient inconnu",
        body: text,
        displayPhoneNumber: channel.channel_identifier,
      });
      const result = toSendResult(reply);
      append({
        id: `a-${Date.now()}`,
        from: "agent",
        text: result.ok ? result.reply : `${result.reply} — (${result.reason ?? "ignored"})`,
        time: now(),
        status: "read",
      });
    } catch (err) {
      append({
        id: `a-err-${Date.now()}`,
        from: "agent",
        text: `Erreur agent : ${err instanceof Error ? err.message : String(err)}`,
        time: now(),
        status: "read",
      });
    } finally {
      setWaitingReply(false);
    }
  };

  const isInstagram = channelType === "instagram_test";
  const accent = ACCENTS[channelType];

  // Groupes de temps : bulles consécutives partageant la même minute.
  const groups = React.useMemo(() => {
    return messages.map((m, i) => ({
      isGroupStart: i > 0 && messages[i - 1].time !== m.time,
      isGroupEnd: i === messages.length - 1 || messages[i + 1].time !== m.time,
    }));
  }, [messages]);

  return (
    <div className="flex flex-1 flex-col h-full">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", accent.soft, accent.text)}>
          <MessageSquare className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            {isInstagram ? "Instagram" : "WhatsApp"}
          </p>
          {channel && (
            <span className="mt-0.5 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-mono text-gray-500">
              {channel.channel_identifier}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
          <ConversationPicker
            conversations={conversations}
            selectedId={conversation?.id ?? ""}
            onSelect={onSelectConversation}
            onAdd={onAddConversation}
          />
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span>Connecté</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4" id="messages-container" aria-live="polite">
        {messages.length === 0 && !waitingReply && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <MessageSquare className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-base font-semibold text-gray-700">Aucune conversation</p>
            <p className="mt-1 max-w-xs text-sm text-gray-400">
              Envoyez un premier message patient pour démarrer la conversation avec l'agent.
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const g = groups[i];
          return (
            <div
              key={msg.id}
              className={cn("mb-3 flex w-full", msg.from === "patient" ? "justify-end" : "justify-start", g.isGroupStart && "mt-3")}
            >
              {msg.from === "agent" && (
                <div className="mt-0.5 mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
              )}
              <div className={cn("flex max-w-[90%] flex-col sm:max-w-[75%]", msg.from === "patient" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "px-3.5 py-2 text-sm leading-relaxed",
                    msg.from === "patient"
                      ? cn(accent.solid, "text-white rounded-[18px] rounded-br-[4px]")
                      : "rounded-[18px] rounded-bl-[4px] border border-gray-200 bg-white text-gray-800"
                  )}
                >
                  {msg.text}
                </div>
                {g.isGroupEnd && (
                  <span className="mt-1 text-[11px] text-gray-400 tabular-nums">{msg.time}</span>
                )}
              </div>
            </div>
          );
        })}

        {waitingReply && (
          <div className="mb-3 flex justify-start">
            <div className="mt-0.5 mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-1 rounded-[18px] rounded-bl-[4px] border border-gray-200 bg-white px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="mwr-dot h-1.5 w-1.5 rounded-full bg-gray-400"
                  style={{ animationDelay: `${i * 180}ms` }}
                />
              ))}
              <span className="sr-only">L'agent écrit…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 bg-white px-4 pb-3 pt-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Écrire un message…"
            className="w-full flex-1 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 ease-out focus:border-transparent focus:outline-none focus:ring-2"
            style={{ ["--tw-ring-color" as any]: `${accent.hex}26` }}
          />
          <button
            aria-label="Envoyer"
            onClick={sendMessage}
            disabled={!newMessage.trim() || waitingReply}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-all duration-200 ease-out hover:scale-105 active:scale-95",
              accent.grad,
              "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            )}
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 flex items-center justify-start gap-1 text-[11px] text-gray-400">
          <Lock className="h-3 w-3 shrink-0" />
          <span>Envoi à l'agent via webhook signé (X-Hub-Signature-256) comme le ferait Meta.</span>
        </p>
      </div>
    </div>
  );
}

export default function AgentTestTab() {
  const session = useTestSession();
  const [subTab, setSubTab] = useState<"call" | "whatsapp_test" | "instagram_test">("call");

  const CHANNELS_STORAGE_KEY = `maw3idi:test:channels:${session.cabinetId}`;

  // Une conversation aléatoire par canal test, créée à l'initialisation (aucun
  // patient rattaché : l'agent voit un patient inconnu). Persistée en
  // sessionStorage pour survivre au changement d'onglet / à un rechargement.
  const [conversationsByChannel, setConversationsByChannel] = useState<
    Record<string, TestConversation[]>
  >(() => {
    let stored: Record<string, TestConversation[]> | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = window.sessionStorage.getItem(CHANNELS_STORAGE_KEY);
        if (raw) stored = JSON.parse(raw) as Record<string, TestConversation[]>;
      } catch {
        stored = null;
      }
    }
    const initial: Record<string, TestConversation[]> = { ...(stored ?? {}) };
    const used = new Set(
      Object.values(initial).flat().map((c) => c.contactId)
    );
    for (const channel of TEST_CHANNELS) {
      const exists = session.channels.some((c) => c.channel_type === channel);
      const list = initial[channel];
      if (!exists || (Array.isArray(list) && list.length > 0)) continue;
      initial[channel] = [{
        id: channel,
        channel,
        contactId: randomContactId(used),
      }];
    }
    return initial;
  });

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          CHANNELS_STORAGE_KEY,
          JSON.stringify(conversationsByChannel)
        );
      }
    } catch {
      // stockage indisponible → on survit sans persistance
    }
  }, [CHANNELS_STORAGE_KEY, conversationsByChannel]);

  const [selectedByChannel, setSelectedByChannel] = useState<Record<string, string>>(() => {
    let stored: Record<string, string> | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = window.sessionStorage.getItem(`${CHANNELS_STORAGE_KEY}:selected`);
        if (raw) stored = JSON.parse(raw) as Record<string, string>;
      } catch {
        stored = null;
      }
    }
    const initial: Record<string, string> = {};
    for (const channel of TEST_CHANNELS) {
      const list = conversationsByChannel[channel] ?? [];
      const saved = stored?.[channel];
      initial[channel] =
        saved && list.some((c) => c.id === saved) ? saved : (list[0]?.id ?? "");
    }
    return initial;
  });

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          `${CHANNELS_STORAGE_KEY}:selected`,
          JSON.stringify(selectedByChannel)
        );
      }
    } catch {
      // stockage indisponible → on survit sans persistance
    }
  }, [CHANNELS_STORAGE_KEY, selectedByChannel]);

  const selectConversation = React.useCallback((channel: string, id: string) => {
    setSelectedByChannel((prev) => ({ ...prev, [channel]: id }));
  }, []);

  const addConversation = React.useCallback(
    (channel: TestConversation["channel"]) => {
      setConversationsByChannel((prev) => {
        const current = prev[channel] ?? [];
        const used = new Set(
          Object.values(prev).flat().map((c) => c.contactId)
        );
        const conv: TestConversation = {
          id: `${channel}-${Date.now().toString(36)}${Math.floor(Math.random() * 999)}`,
          channel,
          contactId: randomContactId(used),
        };
        setSelectedByChannel((sel) => ({ ...sel, [channel]: conv.id }));
        return { ...prev, [channel]: [...current, conv] };
      });
    },
    []
  );

  const renderTab = () => {
    if (subTab === "call") {
      return (
        <CallTab
          conversations={conversationsByChannel["call_test"] ?? []}
          selectedId={selectedByChannel["call_test"] ?? ""}
          onSelectConversation={(id) => selectConversation("call_test", id)}
          onAddConversation={() => addConversation("call_test")}
        />
      );
    }
    return (
      <MessageTab
        channelType={subTab}
        conversations={conversationsByChannel[subTab] ?? []}
        selectedId={selectedByChannel[subTab] ?? ""}
        onSelectConversation={(id) => selectConversation(subTab, id)}
        onAddConversation={() => addConversation(subTab)}
      />
    );
  };

  return (
    <div className="flex flex-1 flex-col h-full bg-gray-50">
      <style jsx global>{`
        @keyframes mwr-ring {
          0% { transform: scale(1); opacity: 0.45; }
          100% { transform: scale(1.45); opacity: 0; }
        }
        @keyframes mwr-bar {
          0%, 100% { height: 8px; opacity: 0.85; }
          50% { height: 28px; opacity: 1; }
        }
        @keyframes mwr-fade {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mwr-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
        .mwr-ring { animation: mwr-ring 2s ease-out infinite; }
        .mwr-bar { animation: mwr-bar 1.1s ease-in-out infinite; }
        .mwr-fade { animation: mwr-fade 220ms ease-out both; }
        .mwr-dot { animation: mwr-dot 1.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .mwr-ring { animation: none !important; opacity: 0.2 !important; }
          .mwr-bar { animation: none !important; height: 8px !important; }
          .mwr-dot { animation: none !important; transform: none !important; opacity: 0.5 !important; }
          .mwr-fade { animation: none !important; }
        }
      `}</style>

      <div className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
        <h2 className="text-xl font-semibold text-gray-900">Agent IA</h2>
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
          <button
            onClick={() => setSubTab("call")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out sm:px-4",
              subTab === "call"
                ? "bg-white text-blue-600 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">Appel</span>
          </button>
          <button
            onClick={() => setSubTab("whatsapp_test")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out sm:px-4",
              subTab === "whatsapp_test"
                ? "bg-white text-green-600 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
          <button
            onClick={() => setSubTab("instagram_test")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out sm:px-4",
              subTab === "instagram_test"
                ? "bg-white text-pink-600 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Instagram</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {renderTab()}
      </div>
    </div>
  );
}