import { apiUser } from "@/lib/auth";
import { aiConfigured, aiProvider } from "@/lib/ai";

export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return Response.json({ ai: aiConfigured(), provider: aiProvider() });
}
