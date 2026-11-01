import { origin, redirect, cookie } from "../../../_server/common.js";

export async function onRequestGet(context) {
  return redirect(`${origin(context)}/`, { "Set-Cookie": cookie("sid", "", 0) });
}
