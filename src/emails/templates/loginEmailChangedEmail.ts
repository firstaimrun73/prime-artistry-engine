import { finish } from "./helpers";
import { h1, p, note, btn } from "./chrome";
import { wrap } from "./wrap";

export function loginEmailChangedEmail(vars: Record<string, string | number> = {}) {
  const body =
    h1("Login details updated") +
    p("The email on your Motio2edit account changed from <b>{{old_email}}</b> to <b>{{new_email}}</b>.") +
    p("Use the new email next time you sign in.") +
    `<p style="margin:0 0 16px">${btn("Sign in", "https://motio2edit.com/login")}</p>` +
    note("If you didn't make this change, contact support@motio2edit.com immediately.");
  return finish("Your login details were updated", wrap("Login details updated", body), vars);
}
