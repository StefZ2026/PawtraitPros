import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Scissors, Building2, Sun, Sparkles, Heart, Dog, Cat,
  Palette, Camera, Send, ShoppingBag, LayoutDashboard, LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Edition = "groomer" | "boarding" | "daycare";

interface EditionConfig {
  title: string;
  subtitle: string;
  hero: string;
  icon: typeof Scissors;
  accentClass: string;
  workflow: Array<{ icon: typeof Camera; title: string; description: string }>;
  benefits: string[];
}

const EDITIONS: Record<Edition, EditionConfig> = {
  groomer: {
    title: "For Groomers",
    subtitle: "Pawtrait Pros — Groomer Edition",
    hero: "Delight your clients at checkout with stunning AI pet portraits",
    icon: Scissors,
    accentClass: "from-pink-500/10 via-background to-rose-500/10",
    workflow: [
      { icon: Camera, title: "Snap a Photo", description: "Take a quick photo of each pet after grooming — fresh and fabulous." },
      { icon: Palette, title: "Pick a Pack", description: "Choose from Seasonal, Fun, or Artistic portrait packs curated for groomers." },
      { icon: Sparkles, title: "Auto-Generate", description: "End of day, generate all portraits in one click. AI does the rest." },
      { icon: Send, title: "Text the Owner", description: "Clients get a text with their pet's portrait + a link to order keepsakes." },
    ],
    benefits: [
      "Wow clients at pickup with a beautiful portrait of their freshly groomed pet",
      "New revenue stream — clients order framed prints, mugs, and totes",
      "Stand out from every other groomer in town",
      "Takes 30 seconds per pet — snap, tap, done",
    ],
  },
  boarding: {
    title: "For Boarding",
    subtitle: "Pawtrait Pros — Boarding Edition",
    hero: "Send pet parents a \"while you were away\" portrait they'll treasure",
    icon: Building2,
    accentClass: "from-blue-500/10 via-background to-sky-500/10",
    workflow: [
      { icon: Camera, title: "Batch Photos", description: "Snap candid photos of boarding guests throughout their stay." },
      { icon: Palette, title: "Choose a Theme", description: "Pick from adventure, seasonal, or artistic portrait packs." },
      { icon: Sparkles, title: "Generate Portraits", description: "Batch-generate beautiful portraits for all of today's departures." },
      { icon: Send, title: "Deliver to Owners", description: "Pet parents get a text with their pet's portrait when they pick up." },
    ],
    benefits: [
      "\"While you were away\" portraits that make pickup day magical",
      "Owners share portraits on social media — free marketing for your facility",
      "Keepsake purchases add pure-profit revenue",
      "Works for any size facility — 5 dogs or 500",
    ],
  },
  daycare: {
    title: "For Daycares",
    subtitle: "Pawtrait Pros — Daycare Edition",
    hero: "Keep pet parents engaged with daily portrait drops",
    icon: Sun,
    accentClass: "from-amber-500/10 via-background to-yellow-500/10",
    workflow: [
      { icon: Camera, title: "Daily Photos", description: "Snap photos of each pet during playtime or rest." },
      { icon: Palette, title: "Today's Pack", description: "Pick a fun or seasonal pack — change it up every day." },
      { icon: Sparkles, title: "One-Tap Generate", description: "Generate all portraits at end of day with a single tap." },
      { icon: Send, title: "Instant Delivery", description: "Owners get a text with a link to their pet's portrait gallery." },
    ],
    benefits: [
      "Daily portrait drops keep pet parents engaged and coming back",
      "Parents love sharing their pet's daily portraits on social media",
      "Keepsake orders create recurring revenue per client",
      "The fun factor that sets your daycare apart",
    ],
  },
};

export default function EditionLanding({ edition }: { edition: Edition }) {
  const config = EDITIONS[edition];
  const Icon = config.icon;
  const { user, isLoading, isAuthenticated, logout, isLoggingOut } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 font-serif text-2xl font-bold text-primary">
            <span className="flex items-center gap-0.5"><Dog className="h-6 w-6" /><Cat className="h-6 w-6" /></span>
            Pawtrait Pros
          </Link>
          <nav className="flex items-center gap-2">
            {isLoading ? (
              <div className="w-24 h-9 bg-muted animate-pulse rounded-md" />
            ) : isAuthenticated ? (
              <>
                <Button variant="ghost" className="gap-2" asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback>{user?.firstName?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="icon" onClick={() => logout()} disabled={isLoggingOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <a href="/login"><Button variant="ghost">Log In</Button></a>
                <a href={`/login?edition=${edition}`}><Button>Get Started</Button></a>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${config.accentClass}`} />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 bg-primary/10 text-primary px-6 py-3 rounded-full mb-8">
              <Icon className="h-6 w-6" />
              <span className="text-lg font-serif font-bold tracking-wide">{config.subtitle}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 leading-tight">
              {config.hero}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Beautiful AI-generated portraits that wow your clients and create new revenue.
              No design skills needed — just snap, tap, and send.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Button size="lg" className="gap-2" asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-5 w-5" />
                    Go to Dashboard
                  </Link>
                </Button>
              ) : (
                <a href={`/login?edition=${edition}`}>
                  <Button size="lg" className="gap-2">
                    <Sparkles className="h-5 w-5" />
                    Start Free Trial
                  </Button>
                </a>
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
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Four steps. Under a minute per pet. Repeat daily.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {config.workflow.map((step, index) => (
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

      {/* Benefits */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-4">Why {config.title.replace("For ", "")} Love It</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {config.benefits.map((benefit, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Heart className="h-4 w-4 text-primary" />
                </div>
                <p className="text-muted-foreground">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Keepsakes */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-serif font-bold mb-4">Keepsakes That Sell Themselves</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Your clients receive a link to their pet's portrait and can instantly order framed prints, mugs, tote bags, and holiday cards.
            You earn on every sale — zero inventory, zero hassle.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {["Framed Prints", "Mugs", "Tote Bags", "Holiday Cards"].map((item) => (
              <div key={item} className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <ShoppingBag className="h-4 w-4" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-serif font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Join pet professionals using AI portraits to delight clients and grow revenue.
          </p>
          {isAuthenticated ? (
            <Button size="lg" variant="secondary" className="gap-2" asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="h-5 w-5" />
                Go to Dashboard
              </Link>
            </Button>
          ) : (
            <a href={`/login?edition=${edition}`}>
              <Button size="lg" variant="secondary" className="gap-2">
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
