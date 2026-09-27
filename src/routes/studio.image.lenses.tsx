import { createFileRoute, redirect } from "@tanstack/react-router";

/** More Lenses removed with Lens Studio — legacy URLs go home. */
export const Route = createFileRoute("/studio/image/lenses")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
