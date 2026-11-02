// 결제 준비: 주문을 만들고 카카오페이 결제 화면 주소를 돌려줍니다.
import { currentUser, json, origin, putOrder, kakaopay, cid, PRICES } from "../../../_server/common.js";

export async function onRequestPost(context) {
  const { env, request } = context;
  const user = await currentUser(context);
  if (!user) return json({ error: "login" }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: "bad_request" }, 400); }
  const price = PRICES[body.topic];
  if (!price) return json({ error: "bad_topic" }, 400);
  const clip = (s, n) => String(s || "").slice(0, n);
  const labels = body.topic === "choice" ? { A: clip(body.A, 40), B: clip(body.B, 40) } : null;
  if (labels && (!labels.A || !labels.B)) return json({ error: "bad_choice" }, 400);

  const id = crypto.randomUUID();
  const base = origin(context);
  const res = await kakaopay(env, "ready", {
    cid: cid(env),
    partner_order_id: id,
    partner_user_id: user.u,
    item_name: `Light the Way 타로 · ${price.name}`,
    quantity: 1,
    total_amount: price.amount,
    tax_free_amount: 0,
    approval_url: `${base}/api/pay/approve?order=${id}`,
    cancel_url: `${base}/?pay=cancel`,
    fail_url: `${base}/?pay=fail`
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.tid) return json({ error: "kakaopay_ready", detail: data.error_message || data.msg || null }, 502);

  await putOrder(env, {
    id, user: user.u, topic: body.topic, amount: price.amount,
    q: clip(body.q, 200), labels,
    tid: data.tid, status: "ready", createdAt: Date.now()
  });
  return json({ order: id, pc: data.next_redirect_pc_url, mobile: data.next_redirect_mobile_url });
}
