import { finish } from "./helpers";
import { h1, p, otpBox, note, btn } from "./chrome";
import { wrap } from "./wrap";

export function resetPasswordEmail(vars: Record<string, string | number> = {}) {
  const body =
    h1("Reset your password") +
    p("We got a request to reset the password for {{email}}. Enter this code, then choose a new password.") +
    otpBox("{{otp}}") +
    `<p style="text-align:center;margin:0 0 16px">${btn("Set new password", "{{reset_url}}")}</p>` +
    note("Code valid for 10 minutes. If you didn't ask for this, your account is still safe, just ignore it.");
  return finish("Reset your Motio2edit password", wrap("Password reset code", body), vars);
}
