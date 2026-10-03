import { finish } from "./helpers";
import { h1, p, otpBox, note } from "./chrome";
import { wrap } from "./wrap";

export function loginCodeEmail(vars: Record<string, string | number> = {}) {
  const body =
    h1("Your login code") +
    p("Use this one-time code to finish signing in as <b>{{email}}</b>.") +
    otpBox("{{otp}}") +
    p("It expires in 10 minutes. Never share it with anyone, Motio2edit staff will never ask for it.") +
    note("Not you? Change your password right away.");
  return finish("Your Motio2edit login code", wrap("Your login code", body), vars);
}
