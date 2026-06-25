import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export const Route = createFileRoute("/payment-failed")({
  head: () => ({
    meta: [{ title: "Payment failed — MOTIO2EDIT" }],
  }),
  component: PaymentFailed,
});

function PaymentFailed() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <XCircle className="h-16 w-16 text-destructive" />
        <h1 className="mt-6 text-2xl font-bold">Payment failed</h1>
        <p className="mt-2 text-muted-foreground">
          Your payment could not be completed. No credits were added and you were not charged.
        </p>
        <Button className="mt-8 w-full" onClick={() => navigate({ to: "/pricing" })}>
          Back to pricing
        </Button>
        <Button variant="outline" className="mt-3 w-full" onClick={() => navigate({ to: "/dashboard" })}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
