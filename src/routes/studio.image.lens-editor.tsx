import { createFileRoute, redirect } from "@tanstack/react-router";

/** Lens Studio removed from the product — legacy URLs go home. */
export const Route = createFileRoute("/studio/image/lens-editor")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
