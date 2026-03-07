import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Dog, ShoppingCart, Package, Image, Truck,
  ArrowRight, ArrowLeft, Check, Heart, Download,
  Frame, Coffee, ShoppingBag, ChevronDown, ChevronUp, Gift,
} from "lucide-react";

interface SessionData {
  token: string;
  orgId: number;
  orgName: string;
  orgLogo: string | null;
  dogId: number;
  dogName: string;
  dogBreed: string | null;
  dogSpecies: string;
  portraitImage: string;
  portraitId: number;
  packType: string | null;
  expiresAt: string;
  alternatePortraits: Array<{ id: number; imageUrl: string; styleId: number }>;
}

interface MerchProduct {
  variantId: number;
  name: string;
  category: "frame" | "mug" | "tote";
  size?: string;
  frameColor?: string;
  priceCents: number;
}

interface CartItem {
  productKey: string;
  product: MerchProduct;
  quantity: number;
  occasion?: string;
  occasionName?: string;
}

interface CardOccasionData {
  id: string;
  name: string;
  greetingText: string;
  featured: boolean;
  templateColors: { primary: string; secondary: string; textColor: string };
}

type OrderStep = "browse" | "cart" | "shipping" | "paying" | "confirm";

export default function CustomerOrder() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const searchString = useSearch();
  const { toast } = useToast();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPortraitId, setSelectedPortraitId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<OrderStep>("browse");
  const [frameSize, setFrameSize] = useState("8x10");
  const [frameColor, setFrameColor] = useState("wood");
  const [mugSize, setMugSize] = useState("11oz");
  const [cardFormat, setCardFormat] = useState<"flat" | "folded">("flat");
  const [cardQty, setCardQty] = useState(10);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showAlternates, setShowAlternates] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [shipping, setShipping] = useState({
    name: "",
    email: "",
    phone: "",
    address1: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });

  // Fetch session data
  const { data: session, isLoading, error } = useQuery<SessionData>({
    queryKey: ["/api/customer-session", token],
    queryFn: async () => {
      const res = await fetch(`/api/customer-session/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load");
      }
      return res.json();
    },
    enabled: !!token,
  });

  // Fetch merch products
  const { data: products } = useQuery<{
    frames: MerchProduct[];
    mugs: MerchProduct[];
    totes: MerchProduct[];
    frameSizes: string[];
    frameColors: string[];
  }>({
    queryKey: ["/api/merch/products"],
  });

  // Check greeting card availability + occasions
  const { data: cardAvail } = useQuery<{ available: boolean; occasions: CardOccasionData[] }>({
    queryKey: ["/api/gelato/availability"],
  });

  // Fetch greeting card products
  const { data: cardProducts } = useQuery<{
    cards: Array<{ productUid: string; name: string; format: string; size: string; priceCents: number }>;
  }>({
    queryKey: ["/api/gelato/products"],
    enabled: !!cardAvail?.available,
  });

  // Fetch card preview when occasion changes
  const fetchCardPreview = async (occasionId: string) => {
    const portraitId = selectedPortraitId || session?.portraitId;
    if (!portraitId) return;
    setLoadingPreview(true);
    setCardPreviewUrl(null);
    try {
      const res = await fetch("/api/cards/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portraitId,
          occasion: occasionId,
          format: cardFormat,
          petName: session?.dogName || "Your Pet",
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        setCardPreviewUrl(URL.createObjectURL(blob));
      }
    } catch (e) {
      console.error("Failed to load card preview:", e);
    }
    setLoadingPreview(false);
  };

  // Checkout mutation — creates Stripe Checkout Session and redirects to Stripe
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const imageUrl = selectedImage || session?.portraitImage;
      const res = await fetch("/api/merch/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productKey: item.productKey,
            quantity: item.quantity,
            occasion: item.occasion,
          })),
          customer: {
            name: shipping.name,
            email: shipping.email,
            phone: shipping.phone,
          },
          address: {
            address1: shipping.address1,
            city: shipping.city,
            state_code: shipping.state,
            zip: shipping.zip,
            country_code: shipping.country,
          },
          imageUrl,
          portraitId: selectedPortraitId || session?.portraitId,
          dogId: session?.dogId,
          orgId: session?.orgId,
          sessionToken: token,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Checkout failed");
      }
      return res.json() as Promise<{ checkoutUrl: string; orderId: number; sessionId: string }>;
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: Error) => {
      toast({ title: "Checkout failed", description: error.message, variant: "destructive" });
    },
  });

  // Confirm payment mutation — called when returning from Stripe with session_id
  const confirmMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch("/api/merch/confirm-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Payment confirmation failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setStep("confirm");
      setConfirmingPayment(false);
      toast({ title: "Order confirmed!", description: "Your order has been placed and will be shipped to you." });
    },
    onError: (error: Error) => {
      setConfirmingPayment(false);
      toast({ title: "Confirmation failed", description: error.message, variant: "destructive" });
    },
  });

  // Handle return from Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const payment = params.get("payment");
    const sessionId = params.get("session_id");

    if (payment === "success" && sessionId && !confirmingPayment && step !== "confirm") {
      setConfirmingPayment(true);
      confirmMutation.mutate(sessionId);
    } else if (payment === "canceled") {
      toast({ title: "Payment canceled", description: "Your order was not placed. You can try again.", variant: "destructive" });
      // Clean up URL params
      window.history.replaceState({}, "", `/order/${token}`);
    }
  }, [searchString]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || confirmingPayment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Dog className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">
            {confirmingPayment ? "Confirming your payment..." : "Loading your portrait..."}
          </p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-serif font-bold">Link Not Found</h1>
            <p className="text-muted-foreground">
              {(error as Error)?.message || "This order link may have expired or is invalid."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentImage = selectedImage || session.portraitImage;
  const cartTotal = cart.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);

  const addToCart = (productKey: string, product: MerchProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productKey === productKey);
      if (existing) {
        return prev.map((item) =>
          item.productKey === productKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productKey, product, quantity: 1 }];
    });
    toast({ title: "Added to cart", description: product.name });
  };

  const removeFromCart = (productKey: string, occasion?: string) => {
    setCart((prev) => prev.filter((item) =>
      !(item.productKey === productKey && item.occasion === occasion)
    ));
  };

  const getFrameProductKey = () => `frame_${frameSize.replace("×", "x")}_${frameColor}`;
  const getMugProductKey = () => `mug_${mugSize}`;

  const isShippingValid =
    shipping.name && shipping.address1 && shipping.city && shipping.state && shipping.zip;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {session.orgLogo ? (
              <Avatar className="h-8 w-8">
                <AvatarImage src={session.orgLogo} alt={session.orgName} />
                <AvatarFallback><Heart className="h-4 w-4" /></AvatarFallback>
              </Avatar>
            ) : null}
            <span className="font-serif font-bold text-lg text-primary">{session.orgName}</span>
          </div>
          {cart.length > 0 && step !== "confirm" && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setStep(step === "cart" ? "browse" : "cart")}
            >
              <ShoppingCart className="h-4 w-4" />
              {cart.length} item{cart.length !== 1 ? "s" : ""}
              <Badge variant="secondary">${(cartTotal / 100).toFixed(2)}</Badge>
            </Button>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {step === "confirm" ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                <Check className="h-12 w-12 text-green-600" />
              </div>
              <h1 className="text-2xl font-serif font-bold">Order Confirmed!</h1>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Your order has been placed and will be shipped directly to you. You'll receive tracking info by email.
              </p>
              <div className="pt-4 space-y-2">
                <p className="text-sm font-medium text-green-700">Thank you for your order!</p>
                <Button variant="outline" className="gap-2" asChild>
                  <a href={`/api/portraits/${selectedPortraitId || session.portraitId}/download`} download>
                    <Download className="h-4 w-4" /> Download Free Digital Copy
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : step === "shipping" ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="gap-1" onClick={() => setStep("cart")}>
                <ArrowLeft className="h-4 w-4" /> Back to Cart
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" /> Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Full Name *</label>
                  <Input
                    placeholder="Jane Smith"
                    value={shipping.name}
                    onChange={(e) => setShipping((s) => ({ ...s, name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Email</label>
                    <Input
                      type="email"
                      placeholder="jane@email.com"
                      value={shipping.email}
                      onChange={(e) => setShipping((s) => ({ ...s, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Phone</label>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={shipping.phone}
                      onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Street Address *</label>
                  <Input
                    placeholder="123 Main St"
                    value={shipping.address1}
                    onChange={(e) => setShipping((s) => ({ ...s, address1: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">City *</label>
                    <Input
                      placeholder="City"
                      value={shipping.city}
                      onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">State *</label>
                    <Input
                      placeholder="GA"
                      value={shipping.state}
                      onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">ZIP *</label>
                    <Input
                      placeholder="30188"
                      value={shipping.zip}
                      onChange={(e) => setShipping((s) => ({ ...s, zip: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full gap-2"
                  disabled={!isShippingValid || checkoutMutation.isPending}
                  onClick={() => checkoutMutation.mutate()}
                >
                  {checkoutMutation.isPending ? "Redirecting to payment..." : (
                    <>Proceed to Payment — ${(cartTotal / 100).toFixed(2)} <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : step === "cart" ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="gap-1" onClick={() => setStep("browse")}>
                <ArrowLeft className="h-4 w-4" /> Continue Shopping
              </Button>
            </div>

            <h2 className="text-xl font-serif font-bold">Your Cart</h2>

            {cart.length === 0 ? (
              <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">Your cart is empty</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {cart.map((item) => (
                  <Card key={item.productKey + (item.occasion || "")}>
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        {item.occasionName && (
                          <p className="text-xs text-primary">{item.occasionName}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Qty: {item.quantity} — ${((item.product.priceCents * item.quantity) / 100).toFixed(2)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.productKey, item.occasion)}>
                        Remove
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-lg">${(cartTotal / 100).toFixed(2)}</span>
                </div>

                <p className="text-xs text-muted-foreground">
                  + shipping (calculated at checkout). Every order includes a free hi-res digital download.
                </p>

                <Button className="w-full gap-2" onClick={() => setStep("shipping")}>
                  Proceed to Shipping <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        ) : (
          /* Browse step */
          <div className="space-y-8">
            {/* Portrait display */}
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-serif font-bold">
                {session.dogName}'s Portrait
              </h1>
              <div className="relative mx-auto max-w-sm">
                <img
                  src={currentImage}
                  alt={`${session.dogName}'s portrait`}
                  className="w-full rounded-lg shadow-lg"
                />
              </div>

              {/* Alternate portraits */}
              {session.alternatePortraits.length > 0 && (
                <div>
                  <Button
                    variant="ghost"
                    className="gap-1 text-sm"
                    onClick={() => setShowAlternates(!showAlternates)}
                  >
                    <Image className="h-4 w-4" />
                    Change Image ({session.alternatePortraits.length} others)
                    {showAlternates ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                  {showAlternates && (
                    <div className="flex gap-2 justify-center mt-3 flex-wrap">
                      <button
                        className={`w-16 h-16 rounded-md border-2 overflow-hidden ${
                          !selectedImage ? "border-primary" : "border-border"
                        }`}
                        onClick={() => {
                          setSelectedImage(null);
                          setSelectedPortraitId(null);
                        }}
                      >
                        <img src={session.portraitImage} alt="Original" className="w-full h-full object-cover" />
                      </button>
                      {session.alternatePortraits.map((alt) => (
                        <button
                          key={alt.id}
                          className={`w-16 h-16 rounded-md border-2 overflow-hidden ${
                            selectedPortraitId === alt.id ? "border-primary" : "border-border"
                          }`}
                          onClick={() => {
                            setSelectedImage(alt.imageUrl);
                            setSelectedPortraitId(alt.id);
                          }}
                        >
                          <img src={alt.imageUrl} alt="Alternate" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Product cards */}
            <div className="space-y-6">
              <h2 className="text-lg font-serif font-bold text-center">Order Prints & Merch</h2>

              {/* Framed Prints */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Frame className="h-5 w-5 text-primary" /> Framed Print
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Enhanced matte paper, glass front, ready to hang
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Size</label>
                    <div className="flex gap-2">
                      {(products?.frameSizes || ["8x10", "11x14", "12x16"]).map((size) => (
                        <button
                          key={size}
                          className={`px-3 py-1.5 rounded-md border text-sm ${
                            frameSize === size ? "border-primary bg-primary/5 font-medium" : "border-border"
                          }`}
                          onClick={() => setFrameSize(size)}
                        >
                          {size.replace("x", "×")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Frame Color</label>
                    <div className="flex gap-2">
                      {["wood", "black", "white"].map((color) => (
                        <button
                          key={color}
                          className={`px-3 py-1.5 rounded-md border text-sm capitalize ${
                            frameColor === color ? "border-primary bg-primary/5 font-medium" : "border-border"
                          }`}
                          onClick={() => setFrameColor(color)}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  <span className="font-bold">
                    ${((products?.frames?.find(
                      (f) => f.size === frameSize && f.frameColor === frameColor
                    )?.priceCents || 4999) / 100).toFixed(2)}
                  </span>
                  <Button
                    className="gap-1"
                    onClick={() => {
                      const key = getFrameProductKey();
                      const product = products?.frames?.find(
                        (f) => f.size === frameSize && f.frameColor === frameColor
                      );
                      if (product) addToCart(key, product);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4" /> Add to Cart
                  </Button>
                </CardFooter>
              </Card>

              {/* Mugs */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Coffee className="h-5 w-5 text-primary" /> Ceramic Mug
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    White glossy ceramic, dishwasher safe
                  </p>
                </CardHeader>
                <CardContent>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Size</label>
                    <div className="flex gap-2">
                      {["11oz", "15oz"].map((size) => (
                        <button
                          key={size}
                          className={`px-3 py-1.5 rounded-md border text-sm ${
                            mugSize === size ? "border-primary bg-primary/5 font-medium" : "border-border"
                          }`}
                          onClick={() => setMugSize(size)}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  <span className="font-bold">
                    ${((products?.mugs?.find((m) => m.size === mugSize)?.priceCents || 2499) / 100).toFixed(2)}
                  </span>
                  <Button
                    className="gap-1"
                    onClick={() => {
                      const key = getMugProductKey();
                      const product = products?.mugs?.find((m) => m.size === mugSize);
                      if (product) addToCart(key, product);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4" /> Add to Cart
                  </Button>
                </CardFooter>
              </Card>

              {/* Tote */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingBag className="h-5 w-5 text-primary" /> Tote Bag
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    All-over print, natural canvas
                  </p>
                </CardHeader>
                <CardFooter className="flex items-center justify-between">
                  <span className="font-bold">
                    ${((products?.totes?.[0]?.priceCents || 3499) / 100).toFixed(2)}
                  </span>
                  <Button
                    className="gap-1"
                    onClick={() => {
                      const product = products?.totes?.[0];
                      if (product) addToCart("tote_natural", product);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4" /> Add to Cart
                  </Button>
                </CardFooter>
              </Card>
              {/* Greeting Cards with Occasion Picker */}
              {cardAvail?.available && cardProducts?.cards && cardAvail.occasions && (
                <Card className="col-span-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Gift className="h-5 w-5 text-primary" /> Greeting Cards
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      5×7 cards with matching envelopes — pick an occasion, preview your card, and order!
                      <br />
                      <span className="text-xs">Includes a free hi-res digital download of the portrait.</span>
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Occasion Picker */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Choose an Occasion</label>
                      <div className="flex flex-wrap gap-2">
                        {cardAvail.occasions.map((occ) => (
                          <button
                            key={occ.id}
                            className={`relative px-3 py-2 rounded-lg border text-sm transition-all ${
                              selectedOccasion === occ.id
                                ? "ring-2 ring-offset-1 font-medium"
                                : "border-border hover:border-primary/40"
                            }`}
                            style={
                              selectedOccasion === occ.id
                                ? { borderColor: occ.templateColors.primary, backgroundColor: occ.templateColors.secondary, color: occ.templateColors.textColor, ringColor: occ.templateColors.primary }
                                : undefined
                            }
                            onClick={() => {
                              setSelectedOccasion(occ.id);
                              fetchCardPreview(occ.id);
                            }}
                          >
                            {occ.name}
                            {occ.featured && (
                              <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[9px] px-1 rounded-full leading-tight">
                                NEW
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Card Preview */}
                    {selectedOccasion && (
                      <div className="flex flex-col items-center gap-3">
                        {loadingPreview ? (
                          <div className="w-full max-w-[300px] aspect-[5/7] bg-muted rounded-lg flex items-center justify-center">
                            <span className="text-sm text-muted-foreground animate-pulse">Generating preview...</span>
                          </div>
                        ) : cardPreviewUrl ? (
                          <img
                            src={cardPreviewUrl}
                            alt="Card preview"
                            className="w-full max-w-[300px] rounded-lg shadow-md border"
                          />
                        ) : null}
                      </div>
                    )}

                    {/* Format + Quantity (only show after occasion is selected) */}
                    {selectedOccasion && (
                      <>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Format</label>
                          <div className="flex gap-2">
                            <button
                              className={`px-3 py-1.5 rounded-md border text-sm ${
                                cardFormat === "flat" ? "border-primary bg-primary/5 font-medium" : "border-border"
                              }`}
                              onClick={() => {
                                setCardFormat("flat");
                                if (selectedOccasion) fetchCardPreview(selectedOccasion);
                              }}
                            >
                              Flat Card
                            </button>
                            <button
                              className={`px-3 py-1.5 rounded-md border text-sm ${
                                cardFormat === "folded" ? "border-primary bg-primary/5 font-medium" : "border-border"
                              }`}
                              onClick={() => {
                                setCardFormat("folded");
                                if (selectedOccasion) fetchCardPreview(selectedOccasion);
                              }}
                            >
                              Folded Card
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Quantity</label>
                          <div className="flex gap-2">
                            {[10, 25, 50].map((qty) => (
                              <button
                                key={qty}
                                className={`px-3 py-1.5 rounded-md border text-sm ${
                                  cardQty === qty ? "border-primary bg-primary/5 font-medium" : "border-border"
                                }`}
                                onClick={() => setCardQty(qty)}
                              >
                                {qty} cards
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                  {selectedOccasion && (
                    <CardFooter className="flex items-center justify-between">
                      <span className="font-bold">
                        ${((
                          (cardProducts.cards.find((c) => c.format === cardFormat)?.priceCents || 499) * cardQty
                        ) / 100).toFixed(2)}
                      </span>
                      <Button
                        className="gap-1"
                        onClick={() => {
                          const card = cardProducts.cards.find((c) => c.format === cardFormat);
                          const occasion = cardAvail.occasions.find((o) => o.id === selectedOccasion);
                          if (card && occasion) {
                            const key = cardFormat === "flat" ? "card_flat_5x7" : "card_folded_5x7";
                            const existing = cart.find((c) => c.productKey === key && c.occasion === selectedOccasion);
                            if (existing) {
                              setCart((prev) =>
                                prev.map((c) =>
                                  c.productKey === key && c.occasion === selectedOccasion
                                    ? { ...c, quantity: c.quantity + cardQty }
                                    : c,
                                ),
                              );
                            } else {
                              setCart((prev) => [
                                ...prev,
                                {
                                  productKey: key,
                                  product: {
                                    variantId: 0,
                                    name: `${occasion.name} ${card.name}`,
                                    category: "tote" as any,
                                    priceCents: card.priceCents,
                                  },
                                  quantity: cardQty,
                                  occasion: selectedOccasion,
                                  occasionName: occasion.name,
                                },
                              ]);
                            }
                            toast({ title: `Added ${occasion.name} cards to cart` });
                          }
                        }}
                      >
                        <ShoppingCart className="h-4 w-4" /> Add to Cart
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              )}
            </div>

            {/* Sticky cart bar */}
            {cart.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg">
                <div className="container mx-auto max-w-2xl flex items-center justify-between">
                  <div>
                    <p className="font-bold">${(cartTotal / 100).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{cart.length} item{cart.length !== 1 ? "s" : ""} + free digital</p>
                  </div>
                  <Button className="gap-2" onClick={() => setStep("cart")}>
                    View Cart <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
