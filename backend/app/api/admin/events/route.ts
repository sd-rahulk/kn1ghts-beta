import { cookies } from "next/headers";
import { actorForToken, requireActor, sessionCookieName } from "@/lib/auth";
import { database } from "@/lib/firebase-admin";
import { handler } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The stream closes after 120 seconds; leave time for authentication and cleanup.
export const maxDuration = 180;
export async function GET(request: Request) {
  return handler(async () => {
    const actor = await requireActor();
    await rateLimit(`stream-${actor.uid}`, 20, 60000);
    const token = (await cookies()).get(sessionCookieName)!.value;
    const encoder = new TextEncoder();
    let cleanup = () => {};
    const stream = new ReadableStream({
      start(controller) {
        let closed = false;
        const notify = (kind: string) => { if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ kind })}\n\n`)); };
        const content = database().ref("cms/version"), messages = database().ref("messages").orderByChild("createdAt").limitToLast(1), membership = database().ref(`access/members/${actor.uid}`);
        const onContent = () => notify("content"), onMessages = () => notify("inbox");
        const close = () => { if (closed) return; cleanup(); try { controller.close(); } catch {} };
        const heartbeat = setInterval(() => { if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n")); }, 15000);
        const verification = setInterval(() => { void actorForToken(token).then((current) => { if (!current) close(); }).catch(close); }, 30000);
        const lifetime = setTimeout(close, 120000);
        cleanup = () => {
          if (closed) return;
          closed = true; content.off("value", onContent); messages.off("value", onMessages); membership.off("value", onContent);
          clearInterval(heartbeat); clearInterval(verification); clearTimeout(lifetime);
          request.signal.removeEventListener("abort", close);
        };
        controller.enqueue(encoder.encode("retry: 3000\n\n"));
        content.on("value", onContent, close); messages.on("value", onMessages, close); membership.on("value", onContent, close);
        request.signal.addEventListener("abort", close, { once: true });
      },
      cancel() { cleanup(); },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
  });
}
