import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Users,
  Package,
  Clock,
  CheckCircle,
  Shield,
  Search,
  ArrowLeft,
  Store,
  Ban,
  Check,
  X,
  Receipt,
} from "lucide-react";
import { Link } from "wouter";
import type { User, Subscription } from "@shared/schema";

type AdminStats = {
  totalUsers: number;
  totalSellers: number;
  totalProducts: number;
  pendingSubscriptions: number;
  activeSubscriptions: number;
};

type AdminUser = User & { subscription: Subscription | null; productCount: number };
type SubscriptionWithUser = Subscription & { user: User };

const TYPE_LABELS: Record<string, string> = {
  buyer: "Buyer",
  seller: "Seller",
  dealer: "Dealer",
  importer: "Importer",
  manufacturer: "Manufacturer",
};

const SUB_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  expired: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

function userDisplayName(u: User) {
  return (
    u.businessName ||
    [u.firstName, u.lastName].filter(Boolean).join(" ") ||
    u.email ||
    u.id
  );
}

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [subFilter, setSubFilter] = useState<string>("pending");
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const isAdmin = !!user?.isAdmin;

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAdmin,
  });

  const { data: usersList = [], isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  const { data: subs = [], isLoading: subsLoading } = useQuery<SubscriptionWithUser[]>({
    queryKey: ["/api/admin/subscriptions", subFilter],
    queryFn: async () => {
      const url = subFilter === "all"
        ? "/api/admin/subscriptions"
        : `/api/admin/subscriptions?status=${subFilter}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: isAdmin,
  });

  const invalidateAdmin = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
  };

  const updateUser = useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Record<string, unknown> }) => {
      await apiRequest("PATCH", `/api/admin/users/${id}`, fields);
    },
    onSuccess: () => {
      invalidateAdmin();
      toast({ title: "User updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message?.replace(/^\d+:\s*/, "") || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const decideSubscription = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      await apiRequest("POST", `/api/admin/subscriptions/${id}/${action}`);
    },
    onSuccess: (_data, vars) => {
      invalidateAdmin();
      toast({
        title: vars.action === "approve" ? "Subscription approved" : "Subscription rejected",
        description: vars.action === "approve"
          ? "The user has been notified and can now list products."
          : "The user has been notified to resubmit their payment.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message?.replace(/^\d+:\s*/, "") || "Action failed",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 pb-24">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">Admin access required</h1>
        <p className="text-sm text-muted-foreground">
          You don't have permission to view this page.
        </p>
        <Link href="/">
          <Button variant="outline" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  const filteredUsers = usersList.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      userDisplayName(u).toLowerCase().includes(q) ||
      (u.telegramUsername ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.phone ?? "").toLowerCase().includes(q) ||
      (u.userType ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6" />
          <div>
            <h1 className="font-bold text-lg" data-testid="text-admin-title">Admin Panel</h1>
            <p className="text-xs opacity-80">Manage users, subscriptions and the marketplace</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="p-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="subscriptions" data-testid="tab-subscriptions">
            Payments
            {stats && stats.pendingSubscriptions > 0 && (
              <Badge className="ml-1.5 px-1.5 bg-destructive text-destructive-foreground" data-testid="badge-pending-count">
                {stats.pendingSubscriptions}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-3 mt-4">
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="h-6 w-6 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-bold" data-testid="stat-total-users">{stats.totalUsers}</p>
                    <p className="text-xs text-muted-foreground">Total Users</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Store className="h-6 w-6 mx-auto text-secondary mb-1" />
                    <p className="text-2xl font-bold" data-testid="stat-total-sellers">{stats.totalSellers}</p>
                    <p className="text-xs text-muted-foreground">Sellers</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Package className="h-6 w-6 mx-auto text-accent mb-1" />
                    <p className="text-2xl font-bold" data-testid="stat-total-products">{stats.totalProducts}</p>
                    <p className="text-xs text-muted-foreground">Active Products</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-6 w-6 mx-auto text-green-600 mb-1" />
                    <p className="text-2xl font-bold" data-testid="stat-active-subs">{stats.activeSubscriptions}</p>
                    <p className="text-xs text-muted-foreground">Active Subscriptions</p>
                  </CardContent>
                </Card>
              </div>
              {stats.pendingSubscriptions > 0 && (
                <Card className="border-accent">
                  <CardContent className="p-4 flex items-center space-x-3">
                    <Clock className="h-6 w-6 text-accent flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm" data-testid="text-pending-alert">
                        {stats.pendingSubscriptions} payment{stats.pendingSubscriptions > 1 ? "s" : ""} awaiting approval
                      </p>
                      <p className="text-xs text-muted-foreground">Review receipts in the Payments tab</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="space-y-3 mt-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, @username, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-user-search"
            />
          </div>

          {usersLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
          ) : (
            filteredUsers.map((u) => (
              <Card key={u.id} data-testid={`card-user-${u.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate" data-testid={`text-user-name-${u.id}`}>
                        {userDisplayName(u)}
                        {u.isAdmin && <Shield className="h-3.5 w-3.5 inline ml-1 text-primary" />}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.telegramUsername ? `@${u.telegramUsername}` : u.email || u.phone || u.id}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge variant="outline">{TYPE_LABELS[u.userType ?? "buyer"] ?? u.userType}</Badge>
                      {u.status === "suspended" && (
                        <Badge variant="destructive" data-testid={`badge-suspended-${u.id}`}>Suspended</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span data-testid={`text-user-products-${u.id}`}>{u.productCount} products</span>
                    {u.subscription ? (
                      <span className={`px-1.5 rounded ${SUB_STATUS_COLORS[u.subscription.status ?? ""] ?? ""}`}>
                        {u.subscription.planType} · {u.subscription.status}
                      </span>
                    ) : (
                      <span>No subscription</span>
                    )}
                    {u.createdAt && <span>Joined {new Date(u.createdAt).toLocaleDateString()}</span>}
                  </div>

                  <div className="flex gap-2">
                    <Select
                      value={u.userType ?? "buyer"}
                      onValueChange={(v) => updateUser.mutate({ id: u.id, fields: { userType: v } })}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1" data-testid={`select-user-type-${u.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant={u.status === "suspended" ? "default" : "outline"}
                      className="h-8 text-xs"
                      disabled={updateUser.isPending}
                      onClick={() =>
                        updateUser.mutate({
                          id: u.id,
                          fields: { status: u.status === "suspended" ? "active" : "suspended" },
                        })
                      }
                      data-testid={`button-toggle-status-${u.id}`}
                    >
                      {u.status === "suspended" ? (
                        <><Check className="h-3.5 w-3.5 mr-1" /> Activate</>
                      ) : (
                        <><Ban className="h-3.5 w-3.5 mr-1" /> Suspend</>
                      )}
                    </Button>
                    {u.id !== user?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        disabled={updateUser.isPending}
                        onClick={() => updateUser.mutate({ id: u.id, fields: { isAdmin: !u.isAdmin } })}
                        data-testid={`button-toggle-admin-${u.id}`}
                      >
                        <Shield className="h-3.5 w-3.5 mr-1" />
                        {u.isAdmin ? "Remove Admin" : "Make Admin"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Subscriptions */}
        <TabsContent value="subscriptions" className="space-y-3 mt-4">
          <Select value={subFilter} onValueChange={setSubFilter}>
            <SelectTrigger data-testid="select-sub-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending approval</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>

          {subsLoading ? (
            [...Array(2)].map((_, i) => <Skeleton key={i} className="h-32" />)
          ) : subs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8" data-testid="text-no-subscriptions">
              No {subFilter === "all" ? "" : subFilter + " "}subscriptions
            </p>
          ) : (
            subs.map((s) => (
              <Card key={s.id} data-testid={`card-subscription-${s.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{userDisplayName(s.user)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.user.telegramUsername ? `@${s.user.telegramUsername}` : s.user.email || s.user.phone || s.user.id}
                      </p>
                    </div>
                    <Badge className={SUB_STATUS_COLORS[s.status ?? ""] ?? ""} data-testid={`badge-sub-status-${s.id}`}>
                      {s.status}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>
                      Plan: <span className="font-medium text-foreground">
                        {s.planType === "yearly" ? "Yearly (9,900 ETB)" : s.planType === "monthly" ? "Monthly (990 ETB)" : "Free Trial"}
                      </span>
                    </p>
                    {s.createdAt && <p>Submitted: {new Date(s.createdAt).toLocaleString()}</p>}
                    {s.endDate && <p>Expires: {new Date(s.endDate).toLocaleDateString()}</p>}
                  </div>

                  {s.receiptImage && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setReceiptPreview(s.receiptImage)}
                      data-testid={`button-view-receipt-${s.id}`}
                    >
                      <Receipt className="h-4 w-4 mr-2" /> View Payment Receipt
                    </Button>
                  )}

                  {s.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        disabled={decideSubscription.isPending}
                        onClick={() => decideSubscription.mutate({ id: s.id, action: "approve" })}
                        data-testid={`button-approve-${s.id}`}
                      >
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        disabled={decideSubscription.isPending}
                        onClick={() => decideSubscription.mutate({ id: s.id, action: "reject" })}
                        data-testid={`button-reject-${s.id}`}
                      >
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Receipt preview dialog */}
      <Dialog open={!!receiptPreview} onOpenChange={(open) => !open && setReceiptPreview(null)}>
        <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          {receiptPreview && (
            <img
              src={receiptPreview}
              alt="Payment receipt"
              className="w-full rounded-lg"
              data-testid="img-receipt-full"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
