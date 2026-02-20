import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Heart, Palette, Share2, Sparkles, Dog, Cat, Building2, LogOut, LayoutDashboard, LayoutGrid } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Home() {
  const { user, isLoading, isAuthenticated, logout, isLoggingOut } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 font-serif text-2xl font-bold text-primary" data-testid="link-home">
            <span className="flex items-center gap-0.5"><Dog className="h-6 w-6" /><Cat className="h-6 w-6" /></span>
            Pawtrait Pros
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" data-testid="link-gallery" asChild>
              <Link href="/gallery">Gallery</Link>
            </Button>
            {isLoading ? (
              <div className="w-24 h-9 bg-muted animate-pulse rounded-md" />
            ) : isAuthenticated ? (
              <>
                <Button variant="ghost" className="gap-2" data-testid="link-dashboard" asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                    <AvatarFallback>{user?.firstName?.[0] || user?.email?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                    <Button variant="ghost" size="icon" data-testid="button-logout" onClick={() => logout()} disabled={isLoggingOut}>
                      <LogOut className="h-4 w-4" />
                    </Button>
                </div>
              </>
            ) : (
              <>
                <a href="/login">
                  <Button variant="ghost" data-testid="button-login">Log In</Button>
                </a>
                <a href="/login">
                  <Button data-testid="button-get-started">Get Started</Button>
                </a>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">AI-Powered Pet Portraits</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 leading-tight">
              Delight Your Clients with{" "}
              <span className="text-primary">Stunning Pet Portraits</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Beautiful AI-generated portraits for groomers, boarders, and daycares.
              Wow your clients and create new revenue with 40+ artistic styles.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <>
                  <Button size="lg" className="gap-2" data-testid="button-go-to-dashboard" asChild>
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-5 w-5" />
                      Go to Dashboard
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="gap-2" data-testid="button-view-gallery" asChild>
                    <Link href="/gallery">
                      View Gallery
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <a href="/login">
                    <Button size="lg" className="gap-2" data-testid="button-create-portrait">
                      <Palette className="h-5 w-5" />
                      Create a Portrait
                    </Button>
                  </a>
                  <Button size="lg" variant="outline" className="gap-2" data-testid="button-view-gallery" asChild>
                    <Link href="/gallery">
                      View Gallery
                    </Link>
                  </Button>
                </>
              )}
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4 text-primary" />
                Free 30-day trial
              </span>
              <span>No credit card required</span>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {[
              { style: "Renaissance Noble", image: "/images/styles/renaissance-noble.jpg" },
              { style: "Egyptian Royalty", image: "/images/styles/egyptian-royalty.jpg" },
              { style: "Tutu Princess", image: "/images/styles/tutu-princess.jpg" },
              { style: "Tea Party Guest", image: "/images/styles/tea-party-guest.jpg" },
              { style: "Cozy Cabin", image: "/images/styles/cozy-cabin.jpg" },
            ].map((item, index) => (
              <Link key={index} href="/styles">
                <div
                  className="group relative aspect-square rounded-lg overflow-hidden border border-border/50 hover-elevate"
                  data-testid={`style-preview-${index}`}
                >
                  <img
                    src={item.image}
                    alt={item.style}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 text-center">
                    <span className="text-xs font-medium text-white drop-shadow-lg">{item.style}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-6">
            <p className="text-muted-foreground mb-4">
              Elegant portraits that showcase each pet's unique personality and charm
            </p>
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-view-all-styles" asChild>
              <Link href="/styles">
                <Palette className="h-4 w-4" />
                View All Styles
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Create beautiful portraits for your clients in four simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Dog,
                title: "Upload a Photo",
                description: "Upload a photo of your client's pet. We work with any breed or mix!",
              },
              {
                icon: Palette,
                title: "Choose a Style",
                description: "Select from 40+ stunning artistic styles from Classical to Fun.",
              },
              {
                icon: Sparkles,
                title: "Generate Portrait",
                description: "Our AI creates a unique, beautiful portrait your clients will love.",
              },
              {
                icon: LayoutGrid,
                title: "Build Your Showcase",
                description: "Showcase your work with a beautiful gallery of portraits for your clients.",
              },
            ].map((step, index) => (
              <Card key={index} className="text-center hover-elevate">
                <CardContent className="pt-8 pb-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-sm text-primary font-medium mb-2">Step {index + 1}</div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-4">Why Choose Pawtrait Pros?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Built specifically for pet professionals to delight their clients
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Heart,
                title: "Made for Pros",
                description: "Designed for groomers, boarders, and daycares to wow their clients",
              },
              {
                icon: Palette,
                title: "40+ Art Styles",
                description: "From Renaissance nobles to Egyptian Royalty - find the perfect personality match",
              },
              {
                icon: Building2,
                title: "Business Galleries",
                description: "Create stunning showcases of your work to attract new clients",
              },
              {
                icon: Share2,
                title: "Easy Sharing",
                description: "Each pet gets a unique profile page ready to share on social media",
              },
            ].map((feature, index) => (
              <Card key={index} className="hover-elevate">
                <CardContent className="pt-6">
                  <feature.icon className="h-8 w-8 text-primary mb-4" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-serif font-bold mb-4">Ready to Wow Your Clients?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Join pet professionals using beautiful AI portraits to delight their clients and grow their business.
          </p>
          {isAuthenticated ? (
            <Button size="lg" variant="secondary" className="gap-2" data-testid="button-start-creating" asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="h-5 w-5" />
                Go to Dashboard
              </Link>
            </Button>
          ) : (
            <a href="/login">
              <Button size="lg" variant="secondary" className="gap-2" data-testid="button-start-creating">
                <Sparkles className="h-5 w-5" />
                Start Your Free Trial
              </Button>
            </a>
          )}
        </div>
      </section>

    </div>
  );
}
