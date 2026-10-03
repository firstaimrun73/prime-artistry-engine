import { finish } from "./helpers";
import { h1, p, note, btn } from "./chrome";
import { wrap } from "./wrap";

export function passwordChangedEmail(vars: Record<string, string | number> = {}) {
  const body =
    h1("Password changed ✓") +
    p("Hi {{name}}, your Motio2edit password was changed on <b>{{time}}</b> from {{device}}.") +
    `<p style="margin:0 0 16px">${btn("Go to login", "https://motio2edit.com/login")}</p>` +
    note("Wasn't you? Reset your password now and contact support@motio2edit.com.");
  return finish("Your password was changed", wrap("Your password was changed", body), vars);
}
