/**
 * Pawtrait Pros — Gelato API Client
 *
 * Handles order creation, status checking, and product catalog discovery
 * via the Gelato REST API v4.
 *
 * Requires GELATO_API_KEY env var.
 */

const GELATO_ORDER_BASE = "https://order.gelatoapis.com/v4";
const GELATO_PRODUCT_BASE = "https://product.gelatoapis.com/v3";

function getApiKey(): string {
  const key = process.env.GELATO_API_KEY;
  if (!key) throw new Error("GELATO_API_KEY env var is not set");
  return key;
}

async function gelatoFetch(baseUrl: string, path: string, options: RequestInit = {}): Promise<any> {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "X-API-KEY": getApiKey(),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Gelato API error ${response.status}`;
    throw new Error(`Gelato ${response.status}: ${errorMsg}`);
  }

  return data;
}

// --- TYPES ---

export interface GelatoShippingAddress {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postCode: string;
  country: string; // ISO 2-letter code
  email?: string;
  phone?: string;
}

export interface GelatoOrderItem {
  itemReferenceId: string;
  productUid: string;
  quantity: number;
  files: Array<{
    type: string; // "default", "back", "inside"
    url: string; // publicly accessible URL
  }>;
}

export interface GelatoOrderResponse {
  id: string; // UUID
  orderType: string;
  orderReferenceId: string;
  customerReferenceId: string;
  fulfillmentStatus: string;
  financialStatus: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    itemReferenceId: string;
    productUid: string;
    fulfillmentStatus: string;
    files: any[];
  }>;
}

// --- API METHODS ---

/**
 * Create a new order on Gelato.
 */
export async function createGelatoOrder(
  items: GelatoOrderItem[],
  shippingAddress: GelatoShippingAddress,
  orderReferenceId: string,
  customerReferenceId: string,
): Promise<GelatoOrderResponse> {
  const body = {
    orderType: "order",
    orderReferenceId,
    customerReferenceId,
    currency: "USD",
    items,
    shipmentMethodUid: "standard",
    shippingAddress,
  };

  return gelatoFetch(GELATO_ORDER_BASE, "/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Get order details by Gelato order ID.
 */
export async function getGelatoOrder(orderId: string): Promise<GelatoOrderResponse> {
  return gelatoFetch(GELATO_ORDER_BASE, `/orders/${orderId}`);
}

/**
 * Get a shipping quote for items.
 */
export async function quoteGelatoOrder(
  items: GelatoOrderItem[],
  shippingAddress: GelatoShippingAddress,
): Promise<any> {
  const body = {
    orderType: "order",
    currency: "USD",
    items,
    shipmentMethodUid: "standard",
    shippingAddress,
  };

  return gelatoFetch(GELATO_ORDER_BASE, "/orders:quote", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Cancel a Gelato order (only works before "in_production" status).
 */
export async function cancelGelatoOrder(orderId: string): Promise<any> {
  return gelatoFetch(GELATO_ORDER_BASE, `/orders/${orderId}:cancel`, {
    method: "POST",
  });
}

// --- PRODUCT CATALOG DISCOVERY ---

/**
 * List all available catalogs.
 */
export async function listCatalogs(): Promise<any> {
  return gelatoFetch(GELATO_PRODUCT_BASE, "/catalogs");
}

/**
 * Search for flat card products in the cards catalog.
 */
export async function searchCardProducts(): Promise<any> {
  return gelatoFetch(GELATO_PRODUCT_BASE, "/catalogs/cards/products:search", {
    method: "POST",
    body: JSON.stringify({ attributeFilters: {} }),
  });
}

/**
 * Search for folded card products in the folded-cards catalog.
 */
export async function searchFoldedCardProducts(): Promise<any> {
  return gelatoFetch(GELATO_PRODUCT_BASE, "/catalogs/folded-cards/products:search", {
    method: "POST",
    body: JSON.stringify({ attributeFilters: {} }),
  });
}

/**
 * Get details for a specific product by UID.
 */
export async function getGelatoProduct(productUid: string): Promise<any> {
  return gelatoFetch(GELATO_PRODUCT_BASE, `/products/${productUid}`);
}

/**
 * Build a Gelato order item for a card.
 */
export function buildCardOrderItem(
  productUid: string,
  quantity: number,
  artworkUrls: Array<{ type: string; url: string }>,
  itemReferenceId: string,
): GelatoOrderItem {
  return {
    itemReferenceId,
    productUid,
    quantity,
    files: artworkUrls,
  };
}
