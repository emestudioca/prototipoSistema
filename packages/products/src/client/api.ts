import { request, requestFormData, requestBlob } from "@gestionate/core/client";
import { IProduct, ProductImportResult } from "@gestionate/core/shared";

export const api = {
  getProducts: (params?: { search?: string; category?: string; lowStock?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.category) query.set("category", params.category);
    if (params?.lowStock) query.set("lowStock", "true");
    const qs = query.toString();
    return request<{ products: IProduct[] }>(`/products${qs ? `?${qs}` : ""}`);
  },
  createProduct: (body: Partial<IProduct>) =>
    request<{ product: IProduct }>("/products", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateProduct: (id: string, body: Partial<IProduct>) =>
    request<{ product: IProduct }>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteProduct: (id: string) =>
    request<{ message: string }>(`/products/${id}`, { method: "DELETE" }),
  updateStock: (productId: string, quantity: number, type: "entrada" | "salida") =>
    request<{ product: IProduct }>(`/products/stock`, {
      method: "PUT",
      body: JSON.stringify({ productId, quantity, type }),
    }),
  uploadImage: (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    return requestFormData<{ url: string }>("/products/upload", formData);
  },
  downloadProductTemplate: (): Promise<Blob> =>
    requestBlob("/products/template"),
  importProducts: (file: File): Promise<ProductImportResult> => {
    const formData = new FormData();
    formData.append("file", file);
    return requestFormData<ProductImportResult>("/products/import", formData);
  },
};