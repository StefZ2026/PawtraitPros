/**
 * Pawtrait Pros — Printful API Client
 *
 * Handles order creation, status checking, and shipping estimates
 * via the Printful REST API v2.
 *
 * Requires PRINTFUL_API_KEY env var.
 */

const PRINTFUL_BASE = "https://api.printful.com";

function getApiKey(): string {
  const key = process.env.PRINTFUL_API_KEY;
  if (!key) throw new Error("PRINTFUL_API_KEY env var is not set");
  return key;
}

async function printfulFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${PRINTFUL_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.result || data?.error?.message || `Printful API error ${response.status}`;
    throw new Error(`Printful ${response.status}: ${errorMsg}`);
  }

  return data;
}

// --- TYPES ---

export interface PrintfulRecipient {
  name: string;
  address1: string;
  city: string;
  state_code: string;
  zip: string;
  country_code: string;
  email?: string;
  phone?: string;
}

export interface PrintfulOrderItem {
  variant_id: number;
  quantity: number;
  files: Array<{
    type: "default" | "back" | "preview";
    url: string;
  }>;
}

export interface PrintfulOrderResponse {
  id: number;
  external_id?: string;
  status: string;
  shipping: string;
  created: number;
  updated: number;
  recipient: PrintfulRecipient;
  items: any[];
  retail_costs: {
    currency: string;
    subtotal: string;
    discount: string;
    shipping: string;
    tax: string;
    total: string;
  };
}

// --- API METHODS ---

/**
 * Create a new order on Printful.
 * The order is created in draft status — call confirmOrder() to submit for fulfillment.
 */
export async function createOrder(
  recipient: PrintfulRecipient,
  items: PrintfulOrderItem[],
  externalId?: string,
): Promise<PrintfulOrderResponse> {
  const body: any = {
    recipient,
    items,
    packing_slip: {
      email: "hello@pawtraitpros.com",
      phone: "",
      message: "Thank you for your Pawtrait Pros order! Your pet's portrait was created with love.",
      logo_url: "", // TODO: add Pawtrait Pros logo URL once hosted
    },
  };

  if (externalId) {
    body.external_id = externalId;
  }

  const data = await printfulFetch("/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return data.result;
}

/**
 * Confirm a draft order — submits it for fulfillment.
 */
export async function confirmOrder(orderId: number): Promise<PrintfulOrderResponse> {
  const data = await printfulFetch(`/orders/${orderId}/confirm`, {
    method: "POST",
  });
  return data.result;
}

/**
 * Get order details by Printful order ID.
 */
export async function getOrder(orderId: number): Promise<PrintfulOrderResponse> {
  const data = await printfulFetch(`/orders/${orderId}`);
  return data.result;
}

/**
 * Get order details by external ID (our merch_orders.id).
 */
export async function getOrderByExternalId(externalId: string): Promise<PrintfulOrderResponse> {
  const data = await printfulFetch(`/orders/@${externalId}`);
  return data.result;
}

/**
 * Estimate shipping costs for items to a recipient.
 */
export async function estimateShipping(
  recipient: PrintfulRecipient,
  items: Array<{ variant_id: number; quantity: number }>,
): Promise<Array<{ id: string; name: string; rate: string; currency: string; minDeliveryDays: number; maxDeliveryDays: number }>> {
  const data = await printfulFetch("/shipping/rates", {
    method: "POST",
    body: JSON.stringify({ recipient, items }),
  });
  return data.result;
}

/**
 * Cancel an order (only works for pending/draft orders).
 */
export async function cancelOrder(orderId: number): Promise<PrintfulOrderResponse> {
  const data = await printfulFetch(`/orders/${orderId}`, {
    method: "DELETE",
  });
  return data.result;
}

/**
 * Build a Printful order item from a product variant ID and an image URL.
 * The image URL must be publicly accessible — Printful downloads it.
 */
export function buildOrderItem(variantId: number, quantity: number, imageUrl: string): PrintfulOrderItem {
  return {
    variant_id: variantId,
    quantity,
    files: [
      {
        type: "default",
        url: imageUrl,
      },
    ],
  };
}
