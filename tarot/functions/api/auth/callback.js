// 카카오 로그인 완료: 코드를 토큰으로 바꾸고, 회원 정보를 읽어 로그인 쿠키를 만듭니다.
import { origin, redirect, cookie, getCookie, sign } from "../../../_server/common.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const home = `${origin(context)}/`;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || state !== getCookie(request, "st")) return redirect(`${home}?login=fail`);

  const form = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: env.KAKAO_REST_KEY,
    redirect_uri: `${origin(context)}/api/auth/callback`,
    code
  });
  if (env.KAKAO_CLIENT_SECRET) form.set("client_secret", env.KAKAO_CLIENT_SECRET);
  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: form
  });
  if (!tokenRes.ok) return redirect(`${home}?login=fail`);
  const { access_token } = await tokenRes.json();

  const meRes = await fetch("https://kapi.kakao.com/v2/user/me", { headers: { Authorization: `Bearer ${access_token}` } });
  if (!meRes.ok) return redirect(`${home}?login=fail`);
  const me = await meRes.json();
  const nickname = me.kakao_account?.profile?.nickname || me.properties?.nickname || "회원";

  // 회원 기록(최초 가입일)을 남겨 둡니다.
  const key = `user:${me.id}`;
  const prev = await env.ORDERS.get(key);
  await env.ORDERS.put(key, JSON.stringify({ id: me.id, nickname, joinedAt: prev ? JSON.parse(prev).joinedAt : Date.now(), lastLogin: Date.now() }));

  const sid = await sign(env, { u: String(me.id), n: nickname, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 });
  const headers = new Headers({ Location: home, "Cache-Control": "no-store" });
  headers.append("Set-Cookie", cookie("sid", sid, 60 * 60 * 24 * 30));
  headers.append("Set-Cookie", cookie("st", "", 0));
  return new Response(null, { status: 302, headers });
}
