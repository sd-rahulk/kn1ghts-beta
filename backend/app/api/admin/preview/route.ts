import { requireActor, verifyMutation } from "@/lib/auth";
import { createPreview } from "@/lib/preview";
import { handler, json } from "@/lib/http";

export async function POST(request: Request) {
  return handler(async () => {
    await verifyMutation(request);
    const actor = await requireActor();
    const url = new URL(process.env.PUBLIC_SITE_ORIGIN!);
    url.searchParams.set("preview", createPreview(actor.uid));
    url.searchParams.set("skipIntro", "1");
    return json({ url: url.toString() });
  });
}
