import { finish } from "./helpers";
import { h1, p, note } from "./chrome";
import { wrap } from "./wrap";

export function newSignInEmail(vars: Record<string, string | number> = {}) {
  const body =
    h1("New sign-in") +
    p("Your account was signed in from a new device.") +
    `<table role="presentation" width="100%" style="background:#f6f3f1;border-radius:12px;font:14px Arial;color:#4a4a55"><tr><td style="padding:14px">Device: {{device}}<br>Location: {{location}}<br>Time: {{time}}</td></tr></table>` +
    note("Was this you? Nothing to do. If not, change your password.");
  return finish("New sign-in to your account", wrap("New sign-in detected", body), vars);
}
