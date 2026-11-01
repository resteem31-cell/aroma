// Cloudflare Pages Functions 공용 도구: 가격표, 세션 쿠키, 주문 저장소.
// 비밀값은 모두 Cloudflare 환경 변수에서 읽습니다 (코드에 넣지 마세요).

export const PRICES = {
  love: { name: "연애운", amount: 3900 },
  reunion: { name: "재회운", amount: 3900 },
  career: { name: "진로운", amount: 2900 },
  choice: { name: "선택의 기로", amount: 1800 }
};

const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uText = s => b64u(enc.encode(s));
const fromB64u = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)));

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export async function sign(env, obj) {
  const body = b64uText(JSON.stringify(obj));
  return `${body}.${await hmac(env.SESSION_SECRET, body)}`;
}

export async function verify(env, token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (sig !== await hmac(env.SESSION_SECRET, body)) return null;
  try {
    const obj = JSON.parse(fromB64u(body));
    if (obj.exp && obj.exp < Date.now()) return null;
    return obj;
  } catch { return null; }
}

export function getCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  const m = raw.split(/;\s*/).find(p => p.startsWith(name + "="));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}

export const cookie = (name, value, maxAge) =>
  `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export async function currentUser(context) {
  return verify(context.env, getCookie(context.request, "sid"));
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export const redirect = (url, headers = {}) =>
  new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "no-store", ...headers } });

export const origin = context => context.env.SITE_URL || new URL(context.request.url).origin;

// 주문은 Cloudflare KV(ORDERS)에 90일 동안 보관합니다.
const TTL = 60 * 60 * 24 * 90;
export const getOrder = async (env, id) => {
  if (!/^[0-9a-f-]{36}$/.test(id || "")) return null;
  const raw = await env.ORDERS.get(`order:${id}`);
  return raw ? JSON.parse(raw) : null;
};
export const putOrder = (env, order) => env.ORDERS.put(`order:${order.id}`, JSON.stringify(order), { expirationTtl: TTL });

// 카카오페이 온라인 결제 API
export const KAKAOPAY = "https://open-api.kakaopay.com/online/v1/payment";
export const kakaopay = (env, path, body) => fetch(`${KAKAOPAY}/${path}`, {
  method: "POST",
  headers: { Authorization: `SECRET_KEY ${env.KAKAOPAY_SECRET_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
export const cid = env => env.KAKAOPAY_CID || "TC0ONETIME";
