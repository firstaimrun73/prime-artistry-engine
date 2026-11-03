import { createFileRoute } from "@tanstack/react-router";
import { parseCheckoutSearch } from "@/lib/checkout-search";
import { CheckoutPage } from "@/components/CheckoutPage";

export const Route = createFileRoute("/checkout")({
  validateSearch: (s: Record<string, unknown>) => parseCheckoutSearch(s),
  component: CheckoutPage,
});
