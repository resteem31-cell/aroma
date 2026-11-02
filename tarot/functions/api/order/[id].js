// 결제한 주문 읽기(GET)와 뽑은 카드·행운의 카드 저장(POST).
// 한 주문으로 카드를 한 번만 뽑을 수 있고, 저장된 카드는 다시 열어 볼 수 있습니다.
import { currentUser, getOrder, putOrder, json } from "../../../_server/common.js";

const view = o => ({ id: o.id, topic: o.topic, amount: o.amount, q: o.q, labels: o.labels, status: o.status, spreads: o.spreads || null, lucky: o.lucky || null });

export async function onRequestGet(context) {
  const user = await currentUser(context);
  if (!user) return json({ error: "login" }, 401);
  const order = await getOrder(context.env, context.params.id);
  if (!order || order.user !== user.u) return json({ error: "not_found" }, 404);
  return json(view(order));
}

const validSpread = s => Array.isArray(s) && s.length === 11 && s.every(d => d && /^[mwcsp]\d\d$/.test(d.id) && typeof d.rev === "boolean");

export async function onRequestPost(context) {
  const user = await currentUser(context);
  if (!user) return json({ error: "login" }, 401);
  const order = await getOrder(context.env, context.params.id);
  if (!order || order.user !== user.u) return json({ error: "not_found" }, 404);
  let body;
  try { body = await context.request.json(); } catch { return json({ error: "bad_request" }, 400); }

  // 행운의 카드: 풀이를 본 뒤 한 번만 정할 수 있습니다.
  if (body.lucky) {
    if (order.status !== "used" || !/^[mwcsp]\d\d$/.test(body.lucky)) return json({ error: "bad_lucky" }, 400);
    if (!order.lucky) { order.lucky = body.lucky; await putOrder(context.env, order); }
    return json(view(order));
  }
  if (order.status === "used") return json(view(order), 409);
  if (order.status !== "paid") return json({ error: "not_paid" }, 402);
  const keys = order.topic === "choice" ? ["A", "B"] : ["main"];
  if (!body.spreads || !keys.every(k => validSpread(body.spreads[k]))) return json({ error: "bad_spread" }, 400);
  order.spreads = Object.fromEntries(keys.map(k => [k, body.spreads[k].map(d => ({ id: d.id, rev: d.rev }))]));
  order.status = "used";
  order.usedAt = Date.now();
  await putOrder(context.env, order);
  return json(view(order));
}
