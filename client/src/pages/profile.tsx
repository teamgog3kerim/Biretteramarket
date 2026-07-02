import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import SubscriptionModal from "@/components/subscription-modal";
import EditProfileModal from "@/components/edit-profile-modal";
import InterestsModal from "@/components/interests-modal";
import { useState, useEffect } from "react";
import { 
  User, 
  Edit, 
  Crown, 
  Package, 
  ShoppingCart, 
  Heart, 
  Settings, 
  HelpCircle, 
  Languages, 
  LogOut,
  BarChart3,
  Shield
} from "lucide-react";
import { Link } from "wouter";
import { isSellerType, USER_TYPES } from "@shared/schema";
import type { Product, User as UserType, Category, Favorite } from "@shared/schema";

const TYPE_LABELS: Record<string, string> = {
  buyer: "Buyer",
  seller: "Seller",
  dealer: "Dealer",
  importer: "Importer",
  manufacturer: "Manufacturer",
};

type ProductWithRelations = Product & { seller: UserType; category: Category };
type FavoriteWithRelations = Favorite & { product: ProductWithRelations };

export default function Profile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showInterests, setShowInterests] = useState(false);

  const { data: userProducts = [] } = useQuery<ProductWithRelations[]>({
    queryKey: ["/api/seller/products"],
    enabled: isSellerType(user?.userType),
  });

  const { data: favorites = [] } = useQuery<FavoriteWithRelations[]>({
    queryKey: ["/api/favorites"],
  });

  const updateUserType = useMutation({
    mutationFn: async (userType: string) => {
      await apiRequest("PATCH", "/api/auth/user/type", { userType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Account type updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update account type",
        variant: "destructive",
      });
    },
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const showComingSoon = () => {
    toast({
      title: "Coming soon",
      description: "This feature is not available yet.",
    });
  };

  const getSubscriptionStatus = () => {
    if (!user?.subscription || !user.subscription.endDate) return null;
    
    const endDate = new Date(user.subscription.endDate);
    const now = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      ...user.subscription,
      daysLeft: Math.max(0, daysLeft),
    };
  };

  const subscriptionStatus = getSubscriptionStatus();

  if (isLoading) {
    return (
      <div className="pb-20 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-20 bg-muted rounded-lg"></div>
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-primary p-4 text-primary-foreground">
        <h1 className="text-xl font-bold mb-4">Profile</h1>
      </div>

      <div className="p-4">
        {/* User Profile Card */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center">
                {user?.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-8 w-8 text-accent-foreground" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold" data-testid="text-user-name">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email?.split('@')[0] || "User"
                  }
                </h3>
                <p className="text-sm text-muted-foreground" data-testid="text-user-email">
                  {user?.email || "No email"}
                </p>
                {isSellerType(user?.userType) && user?.businessName && (
                  <p className="text-sm font-medium" data-testid="text-business-name">
                    {user.businessName}
                  </p>
                )}
                {user?.phone && (
                  <p className="text-xs text-muted-foreground" data-testid="text-user-phone">
                    {user.phone}
                  </p>
                )}
                {user?.location && (
                  <p className="text-xs text-muted-foreground" data-testid="text-user-location">
                    {user.location}
                  </p>
                )}
                <div className="flex items-center mt-1 space-x-2">
                  <Badge variant={isSellerType(user?.userType) ? 'default' : 'secondary'}>
                    {TYPE_LABELS[user?.userType || 'buyer'] || 'Buyer'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Member since {user?.createdAt ? new Date(user.createdAt).getFullYear() : '2024'}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEditProfile(true)}
                data-testid="button-edit-profile"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            
            {/* User Type Switcher */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm font-medium mb-2">Account Type:</p>
              <div className="flex flex-wrap gap-2">
                {USER_TYPES.map((type) => (
                  <Button
                    key={type}
                    variant={user?.userType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateUserType.mutate(type)}
                    disabled={updateUserType.isPending}
                    data-testid={`button-switch-${type}`}
                  >
                    {TYPE_LABELS[type]}
                  </Button>
                ))}
              </div>
              {isSellerType(user?.userType) && (
                <p className="text-xs text-muted-foreground mt-2">
                  Seller accounts get a 20-day free trial, then 990 ETB/month to list products.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subscription Status */}
        {subscriptionStatus && subscriptionStatus.planType !== 'free_trial' && (
          <Card className="mb-4 bg-gradient-to-r from-accent to-primary text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold flex items-center">
                  <Crown className="h-5 w-5 mr-2" />
                  Premium Subscription
                </h3>
              </div>
              <p className="text-sm opacity-90 mb-3" data-testid="text-subscription-status">
                {subscriptionStatus.daysLeft > 0 
                  ? `${subscriptionStatus.daysLeft} days remaining in your plan`
                  : 'Your subscription has expired'
                }
              </p>
              <Button
                onClick={() => setShowSubscriptionModal(true)}
                className="bg-white text-primary hover:bg-white/90"
                size="sm"
                data-testid="button-manage-subscription"
              >
                Manage Subscription
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Free Trial Banner (for non-premium users) */}
        {(!subscriptionStatus || subscriptionStatus.planType === 'free_trial') && (
          <Card className="mb-4 bg-muted">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">
                    {subscriptionStatus?.planType === 'free_trial' ? 'Free Trial Active' : 'Start Free Trial'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {subscriptionStatus?.planType === 'free_trial' 
                      ? `${subscriptionStatus.daysLeft} days remaining`
                      : 'Get 20 days free access to seller contacts'
                    }
                  </p>
                </div>
                <Button
                  onClick={() => setShowSubscriptionModal(true)}
                  data-testid="button-upgrade-now"
                >
                  {subscriptionStatus?.planType === 'free_trial' ? 'Upgrade' : 'Start Trial'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Seller Dashboard (Sellers only) */}
        {isSellerType(user?.userType) && (
          <Card className="mb-4 bg-gradient-to-r from-primary to-secondary text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Seller Dashboard
                  </h3>
                  <p className="text-sm opacity-90">
                    View your sales analytics, market reports, and business insights
                  </p>
                </div>
                <Link href="/seller-dashboard">
                  <Button 
                    className="bg-white text-primary hover:bg-white/90"
                    size="sm"
                    data-testid="button-seller-dashboard"
                  >
                    View Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Menu Options */}
        <div className="space-y-1">
          {/* My Products (Sellers only) */}
          {isSellerType(user?.userType) && (
            <Link href="/seller-dashboard">
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between p-3 h-auto"
                data-testid="button-my-products"
              >
                <div className="flex items-center space-x-3">
                  <Package className="h-5 w-5 text-secondary" />
                  <span className="flex-1 text-left">My Products</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" data-testid="text-product-count">
                    {userProducts.length}
                  </Badge>
                  <i className="fas fa-chevron-right text-muted-foreground text-sm"></i>
                </div>
              </Button>
            </Link>
          )}

          {/* Market Interests */}
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-3 h-auto"
            onClick={() => setShowInterests(true)}
            data-testid="button-market-interests"
          >
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-5 w-5 text-secondary" />
              <span className="flex-1 text-left">Market Interests</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" data-testid="text-interests-count">
                {user?.interestedCategoryIds?.length ?? 0}
              </Badge>
              <i className="fas fa-chevron-right text-muted-foreground text-sm"></i>
            </div>
          </Button>

          {/* Orders/Purchases */}
          <Link href="/orders">
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-3 h-auto"
              data-testid="button-my-orders"
            >
              <div className="flex items-center space-x-3">
                <ShoppingCart className="h-5 w-5 text-secondary" />
                <span className="flex-1 text-left">My Orders</span>
              </div>
              <i className="fas fa-chevron-right text-muted-foreground text-sm"></i>
            </Button>
          </Link>

          {/* Favorites */}
          <Link href="/favorites">
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-3 h-auto"
              data-testid="button-favorites"
            >
              <div className="flex items-center space-x-3">
                <Heart className="h-5 w-5 text-secondary" />
                <span className="flex-1 text-left">Favorites</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" data-testid="text-favorites-count">
                  {favorites.length}
                </Badge>
                <i className="fas fa-chevron-right text-muted-foreground text-sm"></i>
              </div>
            </Button>
          </Link>

          {/* Admin Panel */}
          {user?.isAdmin && (
            <Link href="/admin">
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between p-3 h-auto"
                data-testid="button-admin-panel"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="flex-1 text-left font-medium">Admin Panel</span>
                </div>
                <i className="fas fa-chevron-right text-muted-foreground text-sm"></i>
              </Button>
            </Link>
          )}

          {/* Settings */}
          <Link href="/settings">
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-3 h-auto"
              data-testid="button-settings"
            >
              <div className="flex items-center space-x-3">
                <Settings className="h-5 w-5 text-secondary" />
                <span className="flex-1 text-left">Settings</span>
              </div>
              <i className="fas fa-chevron-right text-muted-foreground text-sm"></i>
            </Button>
          </Link>

          {/* Help & Support */}
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-3 h-auto"
            onClick={showComingSoon}
            data-testid="button-help-support"
          >
            <div className="flex items-center space-x-3">
              <HelpCircle className="h-5 w-5 text-secondary" />
              <span className="flex-1 text-left">Help & Support</span>
            </div>
            <i className="fas fa-chevron-right text-muted-foreground text-sm"></i>
          </Button>

          {/* Language */}
          <Link href="/settings">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-3 h-auto"
            data-testid="button-language"
          >
            <div className="flex items-center space-x-3">
              <Languages className="h-5 w-5 text-secondary" />
              <span className="flex-1 text-left">Language</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">English | አማርኛ</span>
              <i className="fas fa-chevron-right text-muted-foreground text-sm"></i>
            </div>
          </Button>
          </Link>

          {/* Logout */}
          <Button
            variant="ghost"
            className="w-full flex items-center space-x-3 p-3 text-destructive hover:text-destructive"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5" />
            <span className="flex-1 text-left">Logout</span>
          </Button>
        </div>
      </div>

      <SubscriptionModal 
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />

      {user && (
        <EditProfileModal
          isOpen={showEditProfile}
          onClose={() => setShowEditProfile(false)}
          user={user}
        />
      )}

      <InterestsModal
        isOpen={showInterests}
        initialSelection={user?.interestedCategoryIds}
        onClose={() => setShowInterests(false)}
      />
    </div>
  );
}
