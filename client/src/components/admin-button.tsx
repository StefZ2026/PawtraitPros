import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function AdminFloatingButton() {
  const { isAdmin } = useAuth();

  if (!isAdmin) return null;

  return (
    <Button
      className="fixed top-20 right-4 shadow-lg gap-2 z-50"
      size="sm"
      data-testid="button-admin-floating"
      asChild
    >
      <Link href="/admin">
        <Shield className="h-4 w-4" />
        Admin
      </Link>
    </Button>
  );
}
