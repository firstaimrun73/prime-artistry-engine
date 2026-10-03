/** Re-export all branded email templates (same names as legacy templates.ts). */
export {
  EMAIL_IMAGE_BASE,
  fillTemplate,
  assertNoPlaceholders,
  buildPlanEmailVars,
  finish,
  TRANSACTIONAL_TEMPLATES,
  MARKETING_TEMPLATES,
  type EmailResult,
} from "./helpers";
export { logo, btn, h1, p, otpBox, note, img } from "./chrome";
export { wrap } from "./wrap";
export { pricingTable, featsTable } from "./tables";
export { verifyEmail } from "./verifyEmail";
export { loginCodeEmail } from "./loginCodeEmail";
export { resetPasswordEmail } from "./resetPasswordEmail";
export { passwordChangedEmail } from "./passwordChangedEmail";
export { loginEmailChangedEmail } from "./loginEmailChangedEmail";
export { newSignInEmail } from "./newSignInEmail";
export { welcomeEmail } from "./welcomeEmail";
export { planPurchasedEmail } from "./planPurchasedEmail";
export { promptlessEditsEmail } from "./promptlessEditsEmail";
export { plansNudgeEmail } from "./plansNudgeEmail";
