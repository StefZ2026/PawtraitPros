import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Dog, Cat, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-4 max-w-md">
        <div className="flex justify-center gap-2 mb-6">
          <Dog className="h-12 w-12 text-primary/40" />
          <Cat className="h-12 w-12 text-primary/40" />
        </div>
        <h1 className="text-5xl font-serif font-bold text-primary mb-3">404</h1>
        <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          This page wandered off. Let's get you back on track.
        </p>
        <Button className="gap-2" asChild>
          <Link href="/">
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
