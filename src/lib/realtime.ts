"use client";

import * as React from "react";

import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";

export interface RealtimeEvent {
  type: string;
  [key: string]: unknown;
}

type Listener = (event: RealtimeEvent) => void;

// --- Shared singleton: one WebSocket per user (doc §2.2) -----------------
// Multiplexed over cabinet channels server-side; ref-counted here so every
// mounted hook shares the same socket instead of opening one per component.

let socket: WebSocket | null = null;
let refs = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let currentKey: string | null = null; // ws_url|token|channel
const listeners = new Set<Listener>();

function notify(event: RealtimeEvent) {
  for (const fn of Array.from(listeners)) {
    try {
      fn(event);
    } catch (err) {
      console.error("Realtime listener error:", err);
    }
  }
}

function scheduleReconnect(connect: () => void) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectDelay = Math.min(reconnectDelay * 2, 30000);
    connect();
  }, reconnectDelay);
}

async function connect(key: string, wsUrl: string, token: string, cabinetId?: string) {
  if (socket && currentKey === key) return;
  disconnectSocket();
  currentKey = key;
  try {
    const url = `${wsUrl}?token=${encodeURIComponent(token)}${cabinetId ? `&cabinet_id=${cabinetId}` : ""}`;
    const ws = new WebSocket(url);
    socket = ws;
    ws.onopen = () => {
      reconnectDelay = 1000;
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        try {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
        } catch {
          /* ignore */
        }
      }, 20000);
    };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as RealtimeEvent;
        if (data && typeof data.type === "string" && data.type !== "ping" && data.type !== "hello") {
          notify(data);
        }
      } catch {
        /* ignore malformed frames */
      }
    };
    const onDead = () => {
      if (socket === ws) {
        disconnectSocket();
        scheduleReconnect(() => void connect(key, wsUrl, token, cabinetId));
      }
    };
    ws.onclose = onDead;
    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    };
  } catch {
    scheduleReconnect(() => void connect(key, wsUrl, token, cabinetId));
  }
}

function disconnectSocket() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
  if (socket) {
    try {
      socket.close();
    } catch {
      /* ignore */
    }
    socket = null;
  }
  currentKey = null;
}

async function ensureConnected(getToken: () => Promise<{ token: string; ws_url: string }>, cabinetId?: string) {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
  try {
    const { token, ws_url } = await getToken();
    await connect(`cabinet:${cabinetId ?? "user"}`, ws_url, token, cabinetId);
  } catch (err) {
    console.error("Realtime connect failed:", err);
  }
}

/** Subscribe to realtime cabinet events. No polling anywhere (doc §2). */
export function useRealtimeEvent(type: string, handler: (event: RealtimeEvent) => void) {
  const handlerRef = React.useRef(handler);
  handlerRef.current = handler;
  React.useEffect(() => {
    const fn: Listener = (event) => {
      if (event.type === type) handlerRef.current(event);
    };
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, [type]);
}

/** Opens (and ref-counts) the shared cabinet socket for the logged-in user. */
export function useCabinetRealtime(enabled = true) {
  const { cabinet, authUser } = useApp();
  const cabinetId = authUser?.isSuperAdmin ? undefined : cabinet?.id;

  React.useEffect(() => {
    if (!enabled || !authUser) return;
    // Super admins hors cabinet : pas de canal (ils gèrent via le polling
    // explicite de la page superadmin).
    if (authUser.isSuperAdmin) return;
    if (!cabinetId) return;
    refs += 1;
    let cancelled = false;
    void ensureConnected(() => api.getWsToken(), undefined).then(() => {
      if (cancelled) {
        refs -= 1;
        if (refs <= 0) {
          refs = 0;
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
          disconnectSocket();
        }
      }
    });
    return () => {
      cancelled = true;
      refs -= 1;
      if (refs <= 0) {
        refs = 0;
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        disconnectSocket();
      }
    };
  }, [enabled, authUser, cabinetId]);
}
