import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Dog, Eye, EyeOff } from "lucide-react";

const ACCESS_CODE = import.meta.env.VITE_ACCESS_CODE || "";
const IS_DEV = import.meta.env.DEV;
const STORAGE_KEY = "pawtrait-pros-access-verified";

interface AccessGateProps {
  children: React.ReactNode;
}

export function AccessGate({ children }: AccessGateProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    if (!ACCESS_CODE || IS_DEV) {
      setIsVerified(true);
      setIsLoading(false);
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setIsVerified(true);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (code.trim() === ACCESS_CODE.trim()) {
      localStorage.setItem(STORAGE_KEY, "true");
      setIsVerified(true);
    } else {
      setError("Invalid access code. Please try again.");
      setCode("");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="animate-pulse">
          <Dog className="h-16 w-16 text-orange-500" />
        </div>
      </div>
    );
  }

  if (isVerified) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <Lock className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Pawtrait Pros Preview
          </CardTitle>
          <CardDescription>
            This site is currently in private beta. Please enter the access code to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type={showCode ? "text" : "password"}
                  placeholder="Enter access code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="text-center text-lg tracking-widest pr-10"
                  data-testid="input-access-code"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowCode(!showCode)}
                  data-testid="button-toggle-code-visibility"
                >
                  {showCode ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full"
              data-testid="button-submit-code"
            >
              Enter Site
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
