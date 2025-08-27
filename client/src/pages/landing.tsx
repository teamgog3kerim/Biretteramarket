import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-secondary flex flex-col">
      {/* Header */}
      <div className="text-center pt-20 pb-10 text-primary-foreground">
        <h1 className="text-4xl font-bold mb-2">Biret Tera</h1>
        <p className="text-lg opacity-90">Ethiopian Construction Materials Marketplace</p>
      </div>

      {/* Hero Section */}
      <div className="flex-1 px-6 pb-8">
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to Ethiopia's Premier Construction Marketplace</CardTitle>
            <CardDescription className="text-base">
              Connect with trusted suppliers of steel, iron, and construction materials across Ethiopia
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Features */}
        <div className="space-y-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center space-x-4">
              <div className="bg-accent rounded-full p-3">
                <i className="fas fa-search text-accent-foreground text-xl"></i>
              </div>
              <div>
                <h3 className="font-semibold">Find Quality Materials</h3>
                <p className="text-sm text-muted-foreground">Browse thousands of steel, iron, and construction materials</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center space-x-4">
              <div className="bg-secondary rounded-full p-3">
                <i className="fas fa-users text-secondary-foreground text-xl"></i>
              </div>
              <div>
                <h3 className="font-semibold">Connect with Suppliers</h3>
                <p className="text-sm text-muted-foreground">Direct access to verified sellers and manufacturers</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center space-x-4">
              <div className="bg-muted rounded-full p-3">
                <i className="fas fa-calculator text-foreground text-xl"></i>
              </div>
              <div>
                <h3 className="font-semibold">Smart Calculators</h3>
                <p className="text-sm text-muted-foreground">Calculate material weights and quantities accurately</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button 
            onClick={handleLogin}
            size="lg"
            className="w-full text-lg font-semibold"
            data-testid="button-login"
          >
            Get Started
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Start with a free 30-day trial. No commitment required.
          </p>
        </div>
      </div>
    </div>
  );
}
