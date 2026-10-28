import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { userFromClaims } from "@/lib/auth-claims";

/**
 * Exige login em todo o site: renova o token da sessão a cada requisição e manda para
 * /login quem não entrou (as rotas /api respondem 401). Aqui só se confere o token (rápido);
 * as rotas e páginas conferem a conta no Supabase (bloqueio, exclusão) por conta própria.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return new NextResponse("Configure as variáveis do Supabase.", { status: 500 });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
        for (const [h, v] of Object.entries(headers ?? {})) response.headers.set(h, v);
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const user = userFromClaims(data?.claims);

  const path = request.nextUrl.pathname;
  // /login fica sempre aberta: um usuário bloqueado ainda tem token válido por alguns minutos,
  // e mandá-lo de volta para "/" criaria um vaivém com o 401 das rotas.
  const isLogin = path === "/login";
  if (!user && !isLogin) {
    if (path.startsWith("/api/")) return withCookies(Response.json({ error: "Entre na sua conta para continuar." }, { status: 401 }), response);
    const to = new URL("/login", request.url);
    if (path !== "/") to.searchParams.set("next", path + request.nextUrl.search);
    return withCookies(NextResponse.redirect(to), response);
  }
  return response;
}

/** Copia os cookies renovados (e os cabeçalhos de não-cache) para outra resposta. */
function withCookies(target: Response, from: NextResponse) {
  const res = target instanceof NextResponse ? target : new NextResponse(target.body, target);
  for (const c of from.cookies.getAll()) res.cookies.set(c);
  for (const h of ["cache-control", "expires", "pragma"]) {
    const v = from.headers.get(h);
    if (v) res.headers.set(h, v);
  }
  return res;
}

export const config = {
  // tudo, menos arquivos estáticos do Next e imagens/ícones públicos
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
