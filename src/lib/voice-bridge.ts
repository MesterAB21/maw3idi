/**
 * Pont audio bidirectionnel pour la voix en direct (mode /test).
 *
 * Flux : micro → AudioContext 16 kHz → worklet → Int16 PCM16 16k → WS →
 *        (gateway/Gemini Live) → WS → Int16 PCM16 24k → worklet 24 kHz → haut-parleurs.
 *
 * Les worklets sont embarqués ici et chargés via Blob URL (pas de fichiers public,
 * MIME correct et pas de carte réseau supplémentaire dans Next).
 */

import type { CallFrame } from "./stream";

export type BridgeStatus = "idle" | "connecting" | "active" | "ended" | "error";

export interface VoiceBridgeCallbacks {
  onStatus: (status: BridgeStatus, detail?: string) => void;
  /** Frame JSON reçue du gateway (call.end / call.error). */
  onFrame: (frame: CallFrame) => void;
  /** Niveau micro capté (RMS 0..1), mis à jour à chaque frame 20 ms. */
  onLevel?: (rms: number) => void;
}

const SOURCE_WORKLET = `
class PCM16Source extends AudioWorkletProcessor {
  constructor() {
    super();
    const srcRate = sampleRate || 48000;
    this.step = srcRate / 16000;
    this.q = [];
    this.nextOut = 0;
    this.frame = new Int16Array(320);
    this.n = 0;
  }
  process(inputs) {
    const ch = inputs[0];
    if (ch && ch[0]) {
      const data = ch[0];
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const s = data[i];
        sum += s * s;
        this.q.push(s > 1 ? 1 : s < -1 ? -1 : s);
      }
      const step = this.step;
      while ((this.nextOut + 1) * step <= this.q.length) {
        const fp = this.nextOut * step;
        const i0 = Math.floor(fp);
        const frac = fp - i0;
        const a = this.q[i0];
        const b = i0 + 1 < this.q.length ? this.q[i0 + 1] : a;
        const s = a + (b - a) * frac;
        this.frame[this.n++] = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
        this.nextOut++;
        if (this.n >= 320) {
          const rms = Math.sqrt(sum / (data.length || 1));
          this.port.postMessage(
            { type: "pcm", data: this.frame, rms: Math.min(1, rms) },
            [this.frame.buffer]
          );
          this.frame = new Int16Array(320);
          this.n = 0;
        }
      }
      const consumed = Math.max(0, Math.floor((this.nextOut - 1) * step) - 2);
      if (consumed > 8192) {
        this.q.splice(0, consumed);
        this.nextOut -= consumed / step;
      }
    }
    return true;
  }
}
registerProcessor("pcm16-source", PCM16Source);
`;

const PLAYER_WORKLET = `
class PCM24Player extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.port.onmessage = (e) => {
      const d = e.data;
      if (d && d.type === "pcm" && d.data) {
        const arr = new Int16Array(d.data);
        for (let i = 0; i < arr.length; i++) {
          this.queue.push(arr[i] < 0 ? arr[i] / 32768 : arr[i] / 32767);
        }
      }
    };
  }
  process(_inputs, outputs) {
    const out = outputs[0][0];
    const take = Math.min(out.length, this.queue.length);
    for (let i = 0; i < take; i++) out[i] = this.queue[i];
    for (let i = take; i < out.length; i++) out[i] = 0;
    if (take > 0) this.queue.splice(0, take);
    return true;
  }
}
registerProcessor("pcm24-player", PCM24Player);
`;

function workletUrl(code: string): string {
  return URL.createObjectURL(
    new Blob([code], { type: "application/javascript" })
  );
}

function normalizeCloseReason(code: number): string | undefined {
  switch (code) {
    case 4401:
      return "Token invalide ou expiré (4401).";
    case 4090:
      return "Appel déjà actif pour cet identifiant (4090).";
    case 1011:
      return "Échec de la session vocale (1011).";
    default:
      return code ? `Fermeture WebSocket (code ${code}).` : undefined;
  }
}

export class VoiceBridge {
  private ws?: WebSocket;
  private micCtx?: AudioContext;
  private playerCtx?: AudioContext;
  private playerNode?: AudioWorkletNode;
  private playerGain?: GainNode;
  private stopMicSource?: AudioWorkletNode;
  private micStream?: MediaStream;
  private micGain?: GainNode;
  private ended = false;
  private muted = false;
  private answered = false;

  constructor(private readonly callbacks: VoiceBridgeCallbacks) {}

  /** Ouvre le WS, initialise le micro + la lecture. Le passage en "active"
   *  (le « cabinet a décroché ») est déclenché par le PREMIER chunk audio
   *  reçu du gateway — pas par l'ouverture du WS. */
  async connect(wsUrl: string): Promise<void> {
    this.ended = false;
    this.answered = false;
    this.callbacks.onStatus("connecting");

    // Lecture 24 kHz (le AudioContext accepte 24 000 Hz ; sinon rate défaut).
    try {
      this.playerCtx = new AudioContext({ sampleRate: 24000 });
    } catch {
      this.playerCtx = new AudioContext();
    }
    if (this.playerCtx.state === "suspended") await this.playerCtx.resume();
    await this.playerCtx.audioWorklet.addModule(workletUrl(PLAYER_WORKLET));
    this.playerNode = new AudioWorkletNode(this.playerCtx, "pcm24-player");
    this.playerGain = this.playerCtx.createGain();
    this.playerGain.gain.value = 1;
    this.playerNode.connect(this.playerGain);
    this.playerGain.connect(this.playerCtx.destination);

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;
      ws.binaryType = "arraybuffer";
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("Impossible de joindre le gateway voix."));
      ws.onclose = (ev) => this.handleClose(ev.code, ev.reason);
      ws.onmessage = (ev) => this.handleMessage(ev.data);
    });

    // Raccroché pendant la connexion → on abandonne proprement.
    if (this.ended) {
      this.ws?.close();
      return;
    }
    await this.startMic();
  }

  private async startMic(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.micStream = stream;

    try {
      this.micCtx = new AudioContext({ sampleRate: 16000 });
    } catch {
      this.micCtx = new AudioContext();
    }
    if (this.micCtx.state === "suspended") await this.micCtx.resume();
    await this.micCtx.audioWorklet.addModule(workletUrl(SOURCE_WORKLET));

    const source = this.micCtx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(this.micCtx, "pcm16-source");
    const mute = this.micCtx.createGain();
    mute.gain.value = 0; // garde le nœud vivant sans retour micro
    node.port.onmessage = (e) => {
      if (e.data?.type === "pcm") {
        if (typeof e.data.rms === "number") this.callbacks.onLevel?.(e.data.rms);
        this.sendAudio(e.data.data as Int16Array);
      }
    };
    source.connect(node);
    node.connect(mute);
    mute.connect(this.micCtx.destination);
    this.stopMicSource = node;
    this.micGain = mute;
  }

  private sendAudio(data: Int16Array): void {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN || this.ended || this.muted) return;
    // Backpressure simple : si le réseau à l'occupé, on laisse tomber du micro
    // plutôt que d'accumuler de la latence.
    if (ws.bufferedAmount > 128000) return;
    ws.send(data);
  }

  /** Coupe/rétablit le micro (le flux continue, mais n'est plus envoyé). */
  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /** Coupe/rétablit le haut-parleur (gain du nœud de sortie). */
  setOutputMuted(muted: boolean): void {
    if (this.playerGain) this.playerGain.gain.value = muted ? 0 : 1;
  }

  private handleMessage(data: unknown): void {
    if (typeof data === "string") {
      try {
        const frame = JSON.parse(data) as CallFrame;
        if (frame.type === "call.error") {
          this.callbacks.onStatus("error", frame.reason ?? "Erreur de l'appel.");
        }
        this.callbacks.onFrame(frame);
      } catch {
        // Frame JSON illisible → ignorée.
      }
      return;
    }
    if (data instanceof ArrayBuffer) {
      if (!this.answered) {
        this.answered = true;
        this.callbacks.onStatus("active");
      }
      const node = this.playerNode;
      if (node) {
        node.port.postMessage({ type: "pcm", data }, [data]);
      }
    }
  }

  private handleClose(code: number, reason: string): void {
    if (this.ended) return;
    this.ended = true;
    const msg = normalizeCloseReason(code) || (reason ? reason : "Appel terminé.");
    this.callbacks.onStatus(code === 1000 || code === 1001 ? "ended" : "error", msg);
  }

  /** Raccroche : message {type:"end"} puis fermeture propre. */
  async end(): Promise<void> {
    if (this.ended) return;
    this.ended = true;
    const ws = this.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "end" }));
      } catch {
        // déjà fermé
      }
      ws.close();
    }
    await this.cleanupAudio();
    this.callbacks.onStatus("ended");
  }

  private async cleanupAudio(): Promise<void> {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = undefined;
    }
    if (this.micCtx) {
      await this.micCtx.close().catch(() => undefined);
      this.micCtx = undefined;
    }
    // Le contexte de lecture reste ouvert pour la durée de vie de la page.
  }
}