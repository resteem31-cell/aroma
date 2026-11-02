// 로그인 상태와 가격표를 알려 줍니다.
import { currentUser, json, PRICES } from "../../_server/common.js";

export async function onRequestGet(context) {
  const user = await currentUser(context);
  return json({ user: user ? { id: user.u, nickname: user.n } : null, prices: PRICES, test: !context.env.KAKAOPAY_CID || context.env.KAKAOPAY_CID === "TC0ONETIME" });
}
