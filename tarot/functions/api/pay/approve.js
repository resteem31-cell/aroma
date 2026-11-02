// 결제 승인: 카카오페이에서 돌아오면 금액을 확인하고 주문을 '결제 완료'로 바꿉니다.
import { getOrder, putOrder, kakaopay, cid, origin, redirect } from "../../../_server/common.js";

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const base = origin(context);
  const order = await getOrder(env, url.searchParams.get("order"));
  const pgToken = url.searchParams.get("pg_token");
  if (!order || !pgToken) return redirect(`${base}/?pay=fail`);
  if (order.status !== "ready") return redirect(`${base}/?order=${order.id}`);

  const res = await kakaopay(env, "approve", {
    cid: cid(env), tid: order.tid,
    partner_order_id: order.id, partner_user_id: order.user,
    pg_token: pgToken
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.amount?.total !== order.amount) {
    order.status = "failed"; order.error = data.error_message || data.msg || "approve_failed";
    await putOrder(env, order);
    return redirect(`${base}/?pay=fail`);
  }
  order.status = "paid";
  order.paidAt = Date.now();
  order.method = data.payment_method_type || null;
  await putOrder(env, order);
  return redirect(`${base}/?order=${order.id}`);
}
