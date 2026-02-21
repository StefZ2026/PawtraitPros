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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import {
  Dog, Cat, Shield, Building2, Image, TrendingUp, DollarSign,
  AlertTriangle, LogOut, Trash2, PawPrint, Plus, Users, X, Mail, ArrowLeft
} from "lucide-react";
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

type AdminView = "dashboard" | "revenue" | "pastdue";

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
    },
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; websiteUrl: string }) => {
      const res = await apiRequest("POST", "/api/admin/organizations", data);
      return res.json();
    },
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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
                          <Input placeholder="Business name" {...field} data-testid="input-new-rescue-name" />
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
                          <Input placeholder="Description (optional)" {...field} data-testid="input-new-rescue-desc" />
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
                          <Input placeholder="Website (optional)" {...field} data-testid="input-new-rescue-website" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={createOrgMutation.isPending} data-testid="button-submit-new-rescue">
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
              <Button size="sm" className="gap-1" onClick={() => setShowCreateForm(true)} data-testid="button-add-rescue">
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
                <Button className="mt-4 gap-1" onClick={() => setShowCreateForm(true)} data-testid="button-add-first-rescue">
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
                      <tr key={org.id} className="border-b last:border-0" data-testid={`row-rescue-${org.id}`}>
                        <td className="py-4">
                          <Link href={`/dashboard?org=${org.id}`} className="block hover:underline" data-testid={`link-rescue-${org.id}`}>
                            <p className="font-medium text-primary" data-testid={`text-rescue-name-${org.id}`}>{org.name}</p>
                            <p className="text-sm text-muted-foreground">{org.contactEmail || "—"}</p>
                          </Link>
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
                              <Link href={`/admin/rescue/${org.id}`}>
                                <Users className="h-4 w-4" />
                              </Link>
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
