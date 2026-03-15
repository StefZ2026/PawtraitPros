import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import {
  Dog, Cat, Shield, Building2, Image, TrendingUp, DollarSign,
  AlertTriangle, LogOut, Trash2, PawPrint, Plus, Users, X, Mail, ArrowLeft,
  Scissors, Sun, Handshake, Smartphone, ShoppingBag, Wallet
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Organization } from "@shared/schema";

interface OrganizationWithStats extends Organization {
  dogCount?: number;
  portraitCount?: number;
  planName?: string;
  planPriceCents?: number;
  addonRevenueCents?: number;
  totalRevenueCents?: number;
}

interface AdminStats {
  totalOrgs: number;
  totalDogs: number;
  totalPortraits: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  pastDue: number;
  planDistribution: {
    trial: number;
    starter: number;
    professional: number;
    executive: number;
  };
}

interface MerchRevenueData {
  byOrg: Array<{
    orgId: number;
    orgName: string;
    orderCount: number;
    totalRevenueCents: number;
    totalShippingCents: number;
    vendorCostCents: number;
    clientPayoutCents: number;
    platformProfitCents: number;
    totalTaxCents: number;
    lastOrderAt: string;
  }>;
  totalRevenueCents: number;
  totalShippingCents: number;
  totalVendorCostCents: number;
  totalClientPayoutCents: number;
  totalPlatformProfitCents: number;
  totalTaxCents: number;
  totalOrders: number;
  availableMonths: string[];
  selectedMonth: string | null;
}

type AdminView = "dashboard" | "revenue" | "pastdue" | "referrals" | "merchrevenue" | "payouts";

interface PayoutSummaryOrg {
  orgId: number;
  orgName: string;
  connectAccountId: string | null;
  connectOnboarded: boolean;
  totalEarnedCents: number;
  totalPaidCents: number;
  pendingBalanceCents: number;
  totalOrders: number;
}

interface ReferralRelationship {
  referrerOrgId: number;
  referrerName: string;
  referredOrgId: number;
  referredName: string;
  referredStatus: string;
  startDate: string | null;
  monthsRemaining: number;
  totalEarnedCents: number;
  totalAppliedCents: number;
  commissionCount: number;
}

function AdminHeader({ adminBadge = true }: { adminBadge?: boolean }) {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-1.5 font-serif font-bold text-xl text-primary" data-testid="link-home-admin">
          <span className="flex items-center gap-0.5"><Dog className="h-5 w-5" /><Cat className="h-5 w-5" /></span>Pawtrait Pros
        </Link>
        <div className="flex items-center gap-2">
          {adminBadge && (
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />
              Admin
            </Badge>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export default function Admin() {
  const [, navigate] = useLocation();
  const { isLoading: authLoading, isAuthenticated, isAdmin, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentView, setCurrentView] = useState<AdminView>("dashboard");
  const [sendingSetupText, setSendingSetupText] = useState<number | null>(null);
  const [merchMonth, setMerchMonth] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({ title: "Please log in", description: "Redirecting to login...", variant: "destructive" });
      setTimeout(() => { window.location.href = "/login"; }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !isAdmin) {
      toast({ title: "Access Denied", description: "You don't have admin access.", variant: "destructive" });
      navigate("/dashboard");
    }
  }, [authLoading, isAuthenticated, isAdmin, navigate, toast]);

  const { data: organizations = [], isLoading: orgsLoading } = useQuery<OrganizationWithStats[]>({
    queryKey: ["/api/admin/organizations"],
    enabled: isAuthenticated && isAdmin,
    staleTime: 0,
  });

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && isAdmin,
    staleTime: 0,
  });

  const { data: activeReferrers = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/organizations/active-referrers"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: referrals = [] } = useQuery<ReferralRelationship[]>({
    queryKey: ["/api/admin/referrals"],
    enabled: isAuthenticated && isAdmin && currentView === "referrals",
  });

  const { data: merchRevenue } = useQuery<MerchRevenueData>({
    queryKey: ["/api/admin/merch-revenue", merchMonth],
    queryFn: async () => {
      const url = merchMonth ? `/api/admin/merch-revenue?month=${merchMonth}` : "/api/admin/merch-revenue";
      const headers = await getAuthHeaders();
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: isAuthenticated && isAdmin,
  });

  const { data: payoutSummary, refetch: refetchPayouts } = useQuery<{ organizations: PayoutSummaryOrg[] }>({
    queryKey: ["/api/admin/payout-summary"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: payoutHistory } = useQuery<{ payouts: any[] }>({
    queryKey: ["/api/admin/payouts"],
    enabled: isAuthenticated && isAdmin && currentView === "payouts",
  });

  const triggerPayoutMutation = useMutation({
    mutationFn: async (orgId: number) => {
      const res = await apiRequest("POST", `/api/admin/payout/${orgId}`);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Payout sent", description: `$${(data.amountCents / 100).toFixed(2)} transferred to ${data.orgName}` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payout-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
    },
    onError: (err: any) => {
      toast({ title: "Payout failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteOrgMutation = useMutation({
    mutationFn: async (orgId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/organizations/${orgId}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Organization deleted", description: "The organization has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      websiteUrl: "",
      referredByOrgId: "",
    },
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; websiteUrl: string; referredByOrgId: string }) => {
      const payload: any = { name: data.name, description: data.description, websiteUrl: data.websiteUrl };
      if (data.referredByOrgId && data.referredByOrgId !== "none") {
        payload.referredByOrgId = parseInt(data.referredByOrgId);
      }
      const res = await apiRequest("POST", "/api/admin/organizations", payload);
      return res.json();
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * (attempt + 1), 3000),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      form.reset();
      setShowCreateForm(false);
      toast({ title: "Business created!", description: "Let's get them set up." });
      if (data?.id) {
        navigate(`/onboarding/${data.id}`);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error creating business", description: "Please try again. If this keeps happening, refresh the page.", variant: "destructive" });
    },
  });

  const handleSendSetupText = async (orgId: number, orgName: string) => {
    setSendingSetupText(orgId);
    try {
      const res = await apiRequest("POST", `/api/admin/organizations/${orgId}/send-setup-text`);
      const data = await res.json();
      if (data.success) {
        toast({ title: "Setup text sent!", description: `Sent to ${orgName} at ${data.phone}` });
      } else {
        toast({ title: "Error", description: data.error || "Failed to send", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to send setup text", variant: "destructive" });
    } finally {
      setSendingSetupText(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  const getPlanLabel = (org: OrganizationWithStats) => {
    const name = org.planName || "none";
    const addonSlots = org.additionalPetSlots || 0;

    const colorMap: Record<string, string> = {
      "free trial": "text-muted-foreground",
      "starter": "text-blue-600 dark:text-blue-400",
      "professional": "text-purple-600 dark:text-purple-400",
      "executive": "text-amber-600 dark:text-amber-400",
    };
    const color = colorMap[name] || "text-muted-foreground";

    if (addonSlots > 0) {
      return (
        <span className={color}>
          {name} <span className="text-xs text-muted-foreground">+ {addonSlots} pet{addonSlots !== 1 ? "s" : ""}</span>
        </span>
      );
    }
    return <span className={color}>{name}</span>;
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <span className="text-green-600 dark:text-green-400">active</span>;
      case "trial":
        return <span className="text-blue-600 dark:text-blue-400">trial</span>;
      case "canceled":
        return <span className="text-red-600 dark:text-red-400">canceled</span>;
      case "past_due":
        return <span className="text-amber-600 dark:text-amber-400">past due</span>;
      default:
        return <span className="text-muted-foreground">trial</span>;
    }
  };

  const planDist = stats?.planDistribution || {
    trial: organizations.filter(o => o.planName === "free trial" || o.subscriptionStatus === "trial").length,
    starter: organizations.filter(o => o.planName === "starter").length,
    professional: organizations.filter(o => o.planName === "professional").length,
    executive: organizations.filter(o => o.planName === "executive").length,
  };

  const revenueOrgs = organizations.filter(o => (o.totalRevenueCents || 0) > 0);
  const pastDueOrgs = organizations.filter(o => o.subscriptionStatus === "past_due");

  if (currentView === "revenue") {
    return (
      <div className="min-h-screen bg-muted/30">
        <AdminHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setCurrentView("dashboard")} data-testid="button-back-revenue">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Monthly Revenue Breakdown</h1>
              <p className="text-muted-foreground">Where your billing is coming from</p>
            </div>
          </div>
          <Card className="bg-background">
            <CardContent className="pt-6">
              {revenueOrgs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No active subscriptions generating revenue.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Business</th>
                        <th className="pb-3 font-medium">Contact</th>
                        <th className="pb-3 font-medium">Plan</th>
                        <th className="pb-3 font-medium text-right">Plan Rev</th>
                        <th className="pb-3 font-medium text-right">Add-on Rev</th>
                        <th className="pb-3 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueOrgs.map((org) => (
                        <tr key={org.id} className="border-b last:border-0" data-testid={`row-revenue-${org.id}`}>
                          <td className="py-3">
                            <p className="font-medium text-primary">{org.name}</p>
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">
                            {org.contactEmail || "—"}
                          </td>
                          <td className="py-3">{getPlanLabel(org)}</td>
                          <td className="py-3 text-right font-medium">${((org.planPriceCents || 0) / 100).toFixed(2)}</td>
                          <td className="py-3 text-right font-medium">
                            {(org.addonRevenueCents || 0) > 0 ? `$${((org.addonRevenueCents || 0) / 100).toFixed(2)}` : "—"}
                          </td>
                          <td className="py-3 text-right font-bold">${((org.totalRevenueCents || 0) / 100).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2">
                        <td colSpan={5} className="py-3 font-bold text-right">Total Monthly Revenue</td>
                        <td className="py-3 text-right font-bold text-lg">
                          ${(revenueOrgs.reduce((sum, o) => sum + (o.totalRevenueCents || 0), 0) / 100).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentView === "pastdue") {
    return (
      <div className="min-h-screen bg-muted/30">
        <AdminHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setCurrentView("dashboard")} data-testid="button-back-pastdue">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Past Due Accounts</h1>
              <p className="text-muted-foreground">Businesses with overdue payments</p>
            </div>
          </div>
          <Card className="bg-background">
            <CardContent className="pt-6">
              {pastDueOrgs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No past due accounts. All caught up!</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Business</th>
                        <th className="pb-3 font-medium">Contact</th>
                        <th className="pb-3 font-medium">Plan</th>
                        <th className="pb-3 font-medium">Amount Due</th>
                        <th className="pb-3 font-medium">Joined</th>
                        <th className="pb-3 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastDueOrgs.map((org) => (
                        <tr key={org.id} className="border-b last:border-0" data-testid={`row-pastdue-${org.id}`}>
                          <td className="py-3">
                            <Link href={`/dashboard?org=${org.id}`} className="hover:underline">
                              <p className="font-medium text-primary">{org.name}</p>
                            </Link>
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">
                            {org.contactEmail || "—"}
                          </td>
                          <td className="py-3">{getPlanLabel(org)}</td>
                          <td className="py-3 font-medium">${((org.planPriceCents || 0) / 100).toFixed(2)}/mo</td>
                          <td className="py-3 text-muted-foreground">
                            {new Date(org.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            {org.contactEmail && (
                              <a href={`mailto:${org.contactEmail}?subject=Pawtrait Pros - Payment Past Due&body=Hi,%0A%0AWe noticed your Pawtrait Pros subscription payment is past due. Please update your payment method to continue using the service.%0A%0AThank you,%0APawtrait Pros Team`}>
                                <Button variant="outline" size="sm" className="gap-1" data-testid={`button-email-${org.id}`}>
                                  <Mail className="h-3.5 w-3.5" />
                                  Email
                                </Button>
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentView === "referrals") {
    const totalEarned = referrals.reduce((sum, r) => sum + r.totalEarnedCents, 0);
    const activeReferralCount = referrals.filter(r => r.monthsRemaining > 0 && r.referredStatus === "active").length;

    return (
      <div className="min-h-screen bg-muted/30">
        <AdminHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setCurrentView("dashboard")} data-testid="button-back-referrals">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Referral Commissions</h1>
              <p className="text-muted-foreground">5% commission on referred subscription payments for 12 months</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="bg-background">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Active Referrals</p>
                <p className="text-2xl font-bold">{activeReferralCount}</p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold">{referrals.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Commissions Paid</p>
                <p className="text-2xl font-bold">${(totalEarned / 100).toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-background">
            <CardContent className="pt-6">
              {referrals.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No referrals yet. When you add a business with a referrer, it will appear here.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Referrer</th>
                        <th className="pb-3 font-medium">Referred</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Earned</th>
                        <th className="pb-3 font-medium">Window</th>
                        <th className="pb-3 font-medium">Payments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.map((r) => (
                        <tr key={`${r.referrerOrgId}-${r.referredOrgId}`} className="border-b last:border-0">
                          <td className="py-3 font-medium">{r.referrerName}</td>
                          <td className="py-3">{r.referredName}</td>
                          <td className="py-3">
                            <Badge variant={r.referredStatus === "active" ? "default" : "secondary"} className="text-xs">
                              {r.referredStatus}
                            </Badge>
                          </td>
                          <td className="py-3 font-medium">${(r.totalEarnedCents / 100).toFixed(2)}</td>
                          <td className="py-3 text-sm text-muted-foreground">
                            {r.monthsRemaining > 0 ? `${r.monthsRemaining} mo left` : "Expired"}
                          </td>
                          <td className="py-3 text-sm">{r.commissionCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentView === "merchrevenue") {
    const merchOrgs = merchRevenue?.byOrg || [];
    const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    const availableMonths = merchRevenue?.availableMonths || [];
    const monthLabel = (m: string) => {
      const [y, mo] = m.split("-");
      return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    };
    return (
      <div className="min-h-screen bg-muted/30">
        <AdminHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setCurrentView("dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Merch P&L</h1>
                <p className="text-muted-foreground">Revenue, costs, and profit by business</p>
              </div>
            </div>
            <select
              className="border rounded-md px-3 py-1.5 text-sm bg-background"
              value={merchMonth}
              onChange={(e) => setMerchMonth(e.target.value)}
            >
              <option value="">All Time</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Card className="bg-background">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold">{fmt(merchRevenue?.totalRevenueCents || 0)}</p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Vendor Costs</p>
                <p className="text-xl font-bold text-red-600">-{fmt((merchRevenue?.totalVendorCostCents || 0) + (merchRevenue?.totalShippingCents || 0))}</p>
                <p className="text-[10px] text-muted-foreground">incl. shipping</p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Client Payouts</p>
                <p className="text-xl font-bold text-red-600">-{fmt(merchRevenue?.totalClientPayoutCents || 0)}</p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Sales Tax</p>
                <p className="text-xl font-bold text-amber-600">{fmt(merchRevenue?.totalTaxCents || 0)}</p>
                <p className="text-[10px] text-muted-foreground">owed to state</p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Our Profit</p>
                <p className="text-xl font-bold text-emerald-600">{fmt(merchRevenue?.totalPlatformProfitCents || 0)}</p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Orders</p>
                <p className="text-xl font-bold">{merchRevenue?.totalOrders || 0}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-background">
            <CardContent className="pt-6">
              {merchOrgs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No merch orders {merchMonth ? "this month" : "yet"}.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 font-medium">Business</th>
                        <th className="pb-3 font-medium text-right">Orders</th>
                        <th className="pb-3 font-medium text-right">Revenue</th>
                        <th className="pb-3 font-medium text-right">Vendor + Ship</th>
                        <th className="pb-3 font-medium text-right">Client Share</th>
                        <th className="pb-3 font-medium text-right">Tax</th>
                        <th className="pb-3 font-medium text-right">Our Profit</th>
                        <th className="pb-3 font-medium text-right">Last Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {merchOrgs.map((org) => (
                        <tr key={org.orgId} className="border-b last:border-0">
                          <td className="py-3 font-medium text-primary">{org.orgName}</td>
                          <td className="py-3 text-right">{org.orderCount}</td>
                          <td className="py-3 text-right">{fmt(org.totalRevenueCents)}</td>
                          <td className="py-3 text-right text-red-600">-{fmt(org.vendorCostCents + org.totalShippingCents)}</td>
                          <td className="py-3 text-right text-red-600">-{fmt(org.clientPayoutCents)}</td>
                          <td className="py-3 text-right text-amber-600">{fmt(org.totalTaxCents)}</td>
                          <td className="py-3 text-right font-bold text-emerald-600">{fmt(org.platformProfitCents)}</td>
                          <td className="py-3 text-right text-muted-foreground">
                            {org.lastOrderAt ? new Date(org.lastOrderAt).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2">
                        <td className="py-3 font-bold">Total</td>
                        <td className="py-3 text-right font-bold">{merchRevenue?.totalOrders || 0}</td>
                        <td className="py-3 text-right font-bold">{fmt(merchRevenue?.totalRevenueCents || 0)}</td>
                        <td className="py-3 text-right font-bold text-red-600">-{fmt((merchRevenue?.totalVendorCostCents || 0) + (merchRevenue?.totalShippingCents || 0))}</td>
                        <td className="py-3 text-right font-bold text-red-600">-{fmt(merchRevenue?.totalClientPayoutCents || 0)}</td>
                        <td className="py-3 text-right font-bold text-amber-600">{fmt(merchRevenue?.totalTaxCents || 0)}</td>
                        <td className="py-3 text-right font-bold text-lg text-emerald-600">{fmt(merchRevenue?.totalPlatformProfitCents || 0)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- PAYOUTS VIEW ---
  if (currentView === "payouts") {
    const payoutOrgs = payoutSummary?.organizations || [];
    const totalPending = payoutOrgs.reduce((s, o) => s + o.pendingBalanceCents, 0);
    return (
      <div className="min-h-screen bg-muted/30">
        <AdminHeader />
        <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setCurrentView("dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h1 className="text-2xl font-serif font-bold">Merch Payouts</h1>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Total Pending</p>
                <p className="text-2xl font-bold text-primary">${(totalPending / 100).toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Businesses with Earnings</p>
                <p className="text-2xl font-bold">{payoutOrgs.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pending Payouts by Business</CardTitle>
            </CardHeader>
            <CardContent>
              {payoutOrgs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No merch earnings recorded yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-sm text-muted-foreground">
                        <th className="pb-3 font-medium text-left">Business</th>
                        <th className="pb-3 font-medium text-center">Connect</th>
                        <th className="pb-3 font-medium text-right">Total Earned</th>
                        <th className="pb-3 font-medium text-right">Total Paid</th>
                        <th className="pb-3 font-medium text-right">Pending</th>
                        <th className="pb-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutOrgs.map((org) => (
                        <tr key={org.orgId} className="border-b last:border-0">
                          <td className="py-3 font-medium">{org.orgName}</td>
                          <td className="py-3 text-center">
                            {org.connectOnboarded ? (
                              <Badge variant="default" className="bg-green-600">Connected</Badge>
                            ) : org.connectAccountId ? (
                              <Badge variant="secondary">Pending</Badge>
                            ) : (
                              <Badge variant="outline">Not Set Up</Badge>
                            )}
                          </td>
                          <td className="py-3 text-right">${(org.totalEarnedCents / 100).toFixed(2)}</td>
                          <td className="py-3 text-right">${(org.totalPaidCents / 100).toFixed(2)}</td>
                          <td className="py-3 text-right font-bold">${(org.pendingBalanceCents / 100).toFixed(2)}</td>
                          <td className="py-3 text-right">
                            <Button
                              size="sm"
                              disabled={!org.connectOnboarded || org.pendingBalanceCents === 0 || triggerPayoutMutation.isPending}
                              onClick={() => {
                                if (confirm(`Pay $${(org.pendingBalanceCents / 100).toFixed(2)} to ${org.orgName}?`)) {
                                  triggerPayoutMutation.mutate(org.orgId);
                                }
                              }}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              Pay Now
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {payoutHistory && payoutHistory.payouts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payout History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-sm text-muted-foreground">
                        <th className="pb-3 font-medium text-left">Business</th>
                        <th className="pb-3 font-medium text-right">Amount</th>
                        <th className="pb-3 font-medium text-center">Status</th>
                        <th className="pb-3 font-medium text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutHistory.payouts.map((p: any) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="py-3 font-medium">{p.org_name}</td>
                          <td className="py-3 text-right font-bold">${(p.amount_cents / 100).toFixed(2)}</td>
                          <td className="py-3 text-center">
                            <Badge variant={p.status === "completed" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>
                              {p.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-right text-sm text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 font-serif font-bold text-xl text-primary" data-testid="link-home-admin">
            <span className="flex items-center gap-0.5"><Dog className="h-5 w-5" /><Cat className="h-5 w-5" /></span>Pawtrait Pros
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />
              Admin
            </Badge>
            <Button variant="ghost" size="icon" data-testid="button-logout-admin" onClick={() => logout()} disabled={isLoggingOut}>
                <LogOut className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Pawtrait Pros Admin</h1>
            <p className="text-muted-foreground">Business overview and billing</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-background">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalOrgs ?? organizations.length}</p>
                  <p className="text-sm text-muted-foreground">Businesses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.activeSubscriptions ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Active Subs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background hover-elevate cursor-pointer" onClick={() => setCurrentView("revenue")} data-testid="card-monthly-revenue">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${stats?.monthlyRevenue ?? 0}</p>
                  <p className="text-sm text-muted-foreground underline">Monthly Rev</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background hover-elevate cursor-pointer" onClick={() => setCurrentView("pastdue")} data-testid="card-past-due">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.pastDue ?? 0}</p>
                  <p className="text-sm text-muted-foreground underline">Past Due</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background hover-elevate cursor-pointer" onClick={() => setCurrentView("referrals")} data-testid="card-referrals">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                  <Handshake className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{organizations.filter(o => (o as any).referredByOrgId).length}</p>
                  <p className="text-sm text-muted-foreground underline">Referrals</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background hover-elevate cursor-pointer" onClick={() => setCurrentView("merchrevenue")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <ShoppingBag className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${((merchRevenue?.totalRevenueCents || 0) / 100).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground underline">Merch Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background hover-elevate cursor-pointer" onClick={() => setCurrentView("payouts")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${((payoutSummary?.organizations || []).reduce((s, o) => s + o.pendingBalanceCents, 0) / 100).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground underline">Pending Payouts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 bg-background">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-0">
                  trial
                </Badge>
                <span className="font-medium">{planDist.trial}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0">
                  starter
                </Badge>
                <span className="font-medium">{planDist.starter}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-0">
                  professional
                </Badge>
                <span className="font-medium">{planDist.professional}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0">
                  executive
                </Badge>
                <span className="font-medium">{planDist.executive}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {showCreateForm && (
          <Card className="mb-6 bg-background">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base font-semibold">Add New Business</CardTitle>
              <Button size="icon" variant="ghost" onClick={() => { setShowCreateForm(false); form.reset(); }} data-testid="button-close-create-form">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createOrgMutation.mutate(data))} className="flex flex-col sm:flex-row gap-3">
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{ required: "Name is required" }}
                    render={({ field }: any) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Business name" {...field} data-testid="input-new-business-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }: any) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Description (optional)" {...field} data-testid="input-new-business-desc" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="websiteUrl"
                    render={({ field }: any) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Website (optional)" {...field} data-testid="input-new-business-website" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="referredByOrgId"
                    render={({ field }: any) => (
                      <FormItem className="flex-1 min-w-[160px]">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-referred-by">
                              <SelectValue placeholder="Referred by (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No referral</SelectItem>
                            {activeReferrers.map((r) => (
                              <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={createOrgMutation.isPending} data-testid="button-submit-new-business">
                    {createOrgMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        <Card className="bg-background">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle className="text-base font-semibold">All Businesses</CardTitle>
              <p className="text-sm text-muted-foreground">
                {organizations.length} registered business{organizations.length !== 1 ? "es" : ""}
              </p>
            </div>
            {!showCreateForm && (
              <Button size="sm" className="gap-1" onClick={() => setShowCreateForm(true)} data-testid="button-add-business">
                <Plus className="h-4 w-4" />
                Add Business
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {orgsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : organizations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No businesses yet</p>
                <Button className="mt-4 gap-1" onClick={() => setShowCreateForm(true)} data-testid="button-add-first-business">
                  <Plus className="h-4 w-4" />
                  Add Your First Business
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Business</th>
                      <th className="pb-3 font-medium">Edition</th>
                      <th className="pb-3 font-medium text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <Dog className="h-4 w-4 inline-block" /><Cat className="h-4 w-4 inline-block" />
                        </div>
                      </th>
                      <th className="pb-3 font-medium min-w-[140px]">Plan</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-center">
                        <PawPrint className="h-4 w-4 inline-block" />
                      </th>
                      <th className="pb-3 font-medium text-center">
                        <Image className="h-4 w-4 inline-block" />
                      </th>
                      <th className="pb-3 font-medium">Joined</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map((org) => (
                      <tr key={org.id} className="border-b last:border-0" data-testid={`row-business-${org.id}`}>
                        <td className="py-4">
                          <Link href={`/dashboard?org=${org.id}`} className="block hover:underline" data-testid={`link-business-${org.id}`}>
                            <p className="font-medium text-primary" data-testid={`text-business-name-${org.id}`}>
                              {org.name}
                              {(org as any).referredByOrgId && (
                                <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 font-normal text-violet-600 border-violet-300">
                                  <Handshake className="h-2.5 w-2.5 mr-0.5" />
                                  Referred
                                </Badge>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">{org.contactEmail || "—"}</p>
                          </Link>
                        </td>
                        <td className="py-4">
                          {org.industryType === "groomer" && (
                            <span className="inline-flex items-center gap-1.5 text-sm text-pink-600 dark:text-pink-400">
                              <Scissors className="h-3.5 w-3.5" /> Groomer
                            </span>
                          )}
                          {org.industryType === "boarding" && (
                            <span className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400">
                              <Building2 className="h-3.5 w-3.5" /> Boarding
                            </span>
                          )}
                          {org.industryType === "daycare" && (
                            <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                              <Sun className="h-3.5 w-3.5" /> Daycare
                            </span>
                          )}
                          {!org.industryType && <span className="text-sm text-muted-foreground">—</span>}
                        </td>
                        <td className="py-4 text-center" data-testid={`text-species-${org.id}`}>
                          <div className="flex items-center justify-center gap-0.5">
                            {(org.speciesHandled === "dogs" || org.speciesHandled === "both") && <Dog className="h-4 w-4 text-muted-foreground" />}
                            {(org.speciesHandled === "cats" || org.speciesHandled === "both") && <Cat className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </td>
                        <td className="py-4">
                          {getPlanLabel(org)}
                        </td>
                        <td className="py-4">
                          {getStatusBadge(org.subscriptionStatus)}
                        </td>
                        <td className="py-4 text-center">
                          {org.dogCount ?? "—"}
                        </td>
                        <td className="py-4 text-center">
                          {org.portraitCount ?? org.portraitsUsedThisMonth ?? 0}
                        </td>
                        <td className="py-4 text-muted-foreground">
                          {new Date(org.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-info-${org.id}`}
                              asChild
                            >
                              <Link href={`/admin/business/${org.id}`}>
                                <Users className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Send Setup Text"
                              onClick={() => handleSendSetupText(org.id, org.name)}
                              disabled={sendingSetupText === org.id}
                              data-testid={`button-phone-${org.id}`}
                            >
                              {sendingSetupText === org.id ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Smartphone className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${org.name}"? This cannot be undone.`)) {
                                  deleteOrgMutation.mutate(org.id);
                                }
                              }}
                              disabled={deleteOrgMutation.isPending}
                              data-testid={`button-delete-${org.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
