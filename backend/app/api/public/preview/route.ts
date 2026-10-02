import { getDraft } from "@/lib/content-store";
import { verifyPreview } from "@/lib/preview";
import { handler, HttpError, json } from "@/lib/http";

export async function GET(request: Request) {
  return handler(async () => {
    const token = new URL(request.url).searchParams.get("token");
    if (!token) throw new HttpError(403, "A preview link is required.");
    await verifyPreview(token);
    return json({ content: (await getDraft()).draft });
  });
}
