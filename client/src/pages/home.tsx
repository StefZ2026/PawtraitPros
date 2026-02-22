import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Heart, Sparkles, Dog, Cat, Building2, LogOut,
  LayoutDashboard, Scissors, Sun, Camera, ShoppingBag, ArrowRight, Palette
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const EDITIONS = [
  {
    key: "groomer",
    title: "For Groomers",
    icon: Scissors,
    tagline: "Delight clients at checkout with stunning pet portraits",
    href: "/for-groomers",
    accent: "from-pink-500/20 to-rose-500/10",
  },
  {
    key: "boarding",
    title: "For Boarding",
    icon: Building2,
    tagline: "Send \"while you were away\" portraits that wow pet parents",
    href: "/for-boarding",
    accent: "from-blue-500/20 to-sky-500/10",
  },
  {
    key: "daycare",
    title: "For Daycares",
    icon: Sun,
    tagline: "Keep pet parents engaged with daily portrait drops",
    href: "/for-daycares",
    accent: "from-amber-500/20 to-yellow-500/10",
  },
];

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

      {/* Hero */}
      <section className="relative pt-32 pb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">AI-Powered Pet Portraits for Professionals</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 leading-tight">
              Delight Your Clients.{" "}
              <span className="text-primary">Grow Your Revenue.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Snap a photo, tap a button, and send your clients a beautiful AI portrait of their pet
              — plus keepsakes they can order on the spot.
            </p>
          </div>
        </div>
      </section>

      {/* Portrait Showcase */}
      <section className="pt-8 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-4">Stunning AI Portraits</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From Renaissance masterpieces to holiday favorites — 40+ styles your clients will love
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {[
              { name: "Renaissance Noble", src: "/images/styles/renaissance-noble.jpg" },
              { name: "Superhero", src: "/images/styles/superhero.jpg" },
              { name: "Holiday Spirit", src: "/images/styles/holiday-spirit.jpg" },
              { name: "Art Nouveau Beauty", src: "/images/styles/art-nouveau.jpg" },
              { name: "Egyptian Royalty", src: "/images/styles/egyptian-royalty.jpg" },
              { name: "Purrista Barista", src: "/images/styles/purrista-barista.jpg" },
              { name: "Space Explorer", src: "/images/styles/space-explorer.jpg" },
              { name: "Spring Blossoms", src: "/images/styles/spring-blossoms.jpg" },
            ].map((item) => (
              <div key={item.name} className="aspect-square rounded-lg overflow-hidden relative group protected-image-wrapper">
                <img
                  src={item.src}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 protected-image"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white text-sm font-medium">{item.name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" className="gap-2" asChild>
              <Link href="/styles">
                <Palette className="h-5 w-5" />
                View All Styles
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Three Editions */}
      <section className="py-16 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-4">Choose Your Edition</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Tailored workflows for every type of pet business
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {EDITIONS.map((edition) => {
              const Icon = edition.icon;
              return (
                <Link key={edition.key} href={edition.href}>
                  <Card className="h-full hover-elevate cursor-pointer group overflow-hidden">
                    <div className={`h-2 bg-gradient-to-r ${edition.accent}`} />
                    <CardContent className="pt-8 pb-6 text-center">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-serif font-bold mb-3">{edition.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{edition.tagline}</p>
                      <div className="inline-flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                        Learn More <ArrowRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Under a minute per pet. Repeat daily.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Camera,
                title: "Snap a Photo",
                description: "Take a quick photo of each pet — any breed, any pose.",
              },
              {
                icon: Sparkles,
                title: "Generate Portraits",
                description: "One tap — AI creates stunning portraits for every pet.",
              },
              {
                icon: Heart,
                title: "Share the Love",
                description: "Text or email portraits to pet parents, and post to social media to attract new clients.",
              },
              {
                icon: ShoppingBag,
                title: "Earn on Keepsakes",
                description: "Clients order framed prints, mugs, and more — you earn on every sale.",
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

      {/* Keepsakes */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-4">Revenue on Autopilot</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every portrait is a sales opportunity. Clients order keepsakes directly — you earn on every sale with zero inventory.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { name: "Framed Prints", desc: "3 sizes, 3 frame colors" },
              { name: "Mugs", desc: "11oz & 15oz" },
              { name: "Tote Bags", desc: "Natural canvas" },
              { name: "Holiday Cards", desc: "Seasonal (Nov-Dec)" },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-3 bg-card border rounded-lg px-5 py-3">
                <ShoppingBag className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-serif font-bold mb-4">Ready to Wow Your Clients?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Join pet professionals using AI portraits to delight clients and grow revenue.
            Free 30-day trial — no credit card required.
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
