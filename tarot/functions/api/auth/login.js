// 카카오 로그인 시작: 카카오 동의 화면으로 보냅니다.
import { origin, redirect, cookie } from "../../../_server/common.js";

export async function onRequestGet(context) {
  const { env } = context;
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: env.KAKAO_REST_KEY,
    redirect_uri: `${origin(context)}/api/auth/callback`,
    response_type: "code",
    state
  });
  return redirect(`https://kauth.kakao.com/oauth/authorize?${params}`, { "Set-Cookie": cookie("st", state, 600) });
}
