import { request } from "@gestionate/core/client";
import { ISale } from "@gestionate/core/shared";

export const api = {
  getSales: (params?: { seller?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.seller) query.set("seller", params.seller);
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return request<{ sales: ISale[] }>(`/sales${qs ? `?${qs}` : ""}`);
  },
  createSale: (body: { items: { productId: string; quantity: number }[]; paymentMethod: string }) =>
    request<{ sale: ISale }>("/sales", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getSale: (id: string) => request<{ sale: ISale }>(`/sales/${id}`),
};