import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Check, X, RefreshCw, Send, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface QueueItem {
  id: number;
  dog_id: number;
  dog_name: string;
  recipient_phone: string;
  message_body: string;
  image_url: string | null;
  pawfile_url: string | null;
  status: string;
  sent_at: string | null;
  error: string | null;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function buildSmsUri(phone: string, body: string): string {
  // iOS uses &body=, Android uses ?body= — but &body= works on both modern devices
  const encoded = encodeURIComponent(body);
  return `sms:${phone}&body=${encoded}`;
}

export default function SendQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sendingId, setSendingId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/sms-queue/status"],
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const items: QueueItem[] = data?.items || [];
  const pendingItems = items.filter((i) => i.status === "pending" || i.status === "claimed");
  const sentItems = items.filter((i) => i.status === "sent");
  const failedItems = items.filter((i) => i.status === "failed");

  const markStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "sent" | "failed" }) => {
      const res = await fetch(`/api/sms-queue/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms-queue/status"] });
    },
  });

  const handleSend = useCallback((item: QueueItem) => {
    setSendingId(item.id);
    // Open native messaging app with pre-filled message
    window.location.href = buildSmsUri(item.recipient_phone, item.message_body);
  }, []);

  const handleMarkSent = useCallback((id: number) => {
    markStatus.mutate({ id, status: "sent" });
    setSendingId(null);
    toast({ title: "Marked as sent" });
  }, [markStatus, toast]);

  const handleMarkFailed = useCallback((id: number) => {
    markStatus.mutate({ id, status: "failed" });
    setSendingId(null);
  }, [markStatus]);

  // After returning from SMS app, show the "Did it send?" prompt
  const showConfirmFor = sendingId;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Send from Your Phone</h1>
          <p className="text-xs text-muted-foreground">
            {pendingItems.length} message{pendingItems.length !== 1 ? "s" : ""} to send
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()}>
          <RefreshCw className="w-5 h-5" />
        </Button>
      </div>

      {/* Pending Messages */}
      {pendingItems.length === 0 && sentItems.length === 0 && failedItems.length === 0 && (
        <div className="px-4 pt-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-lg font-semibold mb-1">No messages in queue</h2>
          <p className="text-sm text-muted-foreground">
            Go to your dashboard and click "Deliver" on pets to queue messages here.
          </p>
        </div>
      )}

      {pendingItems.length > 0 && (
        <div className="px-4 pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Ready to Send
          </h2>
          <div className="space-y-3">
            {pendingItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Portrait thumbnail */}
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.dog_name}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">{item.dog_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatPhone(item.recipient_phone)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {item.message_body}
                      </p>

                      {showConfirmFor === item.id ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleMarkSent(item.id)}
                          >
                            <Check className="w-4 h-4 mr-1" /> Sent
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkFailed(item.id)}
                          >
                            <X className="w-4 h-4 mr-1" /> Failed
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleSend(item)}
                          >
                            Retry
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleSend(item)}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send to {item.dog_name}'s Owner
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Send All shortcut */}
          {pendingItems.length > 1 && !sendingId && (
            <div className="mt-4 p-3 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-2">
                Tap each "Send" button to open your messaging app with the message ready to go.
                Come back and mark each as sent.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sent Messages */}
      {sentItems.length > 0 && (
        <div className="px-4 pt-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Sent Today
          </h2>
          <div className="space-y-2">
            {sentItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2 px-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium flex-1">{item.dog_name}</span>
                <span className="text-xs text-muted-foreground">{formatPhone(item.recipient_phone)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failed Messages */}
      {failedItems.length > 0 && (
        <div className="px-4 pt-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Failed
          </h2>
          <div className="space-y-2">
            {failedItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2 px-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm font-medium flex-1">{item.dog_name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSend(item)}
                  className="text-xs"
                >
                  Retry
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
