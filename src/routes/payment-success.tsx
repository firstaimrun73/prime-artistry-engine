import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/payment-success")({
  head: () => ({
    meta: [{ title: "Payment successful — MOTIO2EDIT" }],
  }),
  component: PaymentSuccess,
});

function PaymentSuccess() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <CheckCircle2 className="h-16 w-16 text-primary" />
        <h1 className="mt-6 text-2xl font-bold">Payment successful!</h1>
        <p className="mt-2 text-muted-foreground">
          Your plan is now active and your credits have been added to your account.
        </p>
        <Button className="mt-8 w-full" onClick={() => navigate({ to: "/dashboard" })}>
          Go to dashboard
        </Button>
        <Button variant="outline" className="mt-3 w-full" onClick={() => navigate({ to: "/editor" })}>
          Open editor
        </Button>
      </div>
    </div>
  );
}
