import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_HEALTH =
  process.env.API_BACKEND_URL ?? "https://maw3idi-backend.onrender.com";

const AGENT_BASE =
  process.env.NEXT_PUBLIC_TEST_AGENT_URL ?? "https://maw3idi-agent.onrender.com/webhooks/test";

function agentHealthUrl(agentUrl: string): string {
  return `${agentUrl.replace(/\/webhooks\/test\/?$/, "").replace(/\/$/, "")}/health`;
}

export async function GET() {
  const targets = [
    { name: "backend", url: `${BACKEND_HEALTH.replace(/\/$/, "")}/health` },
    { name: "agent", url: agentHealthUrl(AGENT_BASE) },
  ];

  const results = await Promise.all(
    targets.map(async (target) => {
      const started = Date.now();
      try {
        const res = await fetch(target.url, {
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        return {
          name: target.name,
          url: target.url,
          status: res.ok ? "ok" : "degraded",
          http: res.status,
          ms: Date.now() - started,
        };
      } catch {
        return {
          name: target.name,
          url: target.url,
          status: "down",
          http: null,
          ms: Date.now() - started,
        };
      }
    })
  );

  const allOk = results.every((r) => r.status === "ok");
  return NextResponse.json(
    {
      service: "keep-alive",
      ts: new Date().toISOString(),
      status: allOk ? "ok" : "degraded",
      checks: results,
    },
    { status: allOk ? 200 : 503 }
  );
}