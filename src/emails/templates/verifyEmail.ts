import { finish } from "./helpers";
import { h1, p, otpBox, note } from "./chrome";
import { wrap } from "./wrap";

export function verifyEmail(vars: Record<string, string | number> = {}) {
  const body =
    h1("Verify your email") +
    p("Hi {{name}}, welcome to Motio2edit. Enter this code to confirm your email address.") +
    otpBox("{{otp}}") +
    p("This code expires in 10 minutes.") +
    note("Didn't sign up? Ignore this email. No account will be activated.");
  return finish("Verify your email · {{otp}}", wrap("Your Motio2edit verification code", body), vars);
}
