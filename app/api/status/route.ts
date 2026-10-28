import { aiConfigured, aiProvider } from "@/lib/ai";

export async function GET() {
  return Response.json({ ai: aiConfigured(), provider: aiProvider() });
}
