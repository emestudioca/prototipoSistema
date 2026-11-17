import { request } from "@gestionate/core/client";
import { ProductFieldDef } from "@gestionate/core/shared";

export const api = {
  getProductModel: () =>
    request<{ fields: ProductFieldDef[] }>("/config/product-model"),
  saveProductModel: (fields: ProductFieldDef[]) =>
    request<{ fields: ProductFieldDef[] }>("/config/product-model", {
      method: "PUT",
      body: JSON.stringify({ fields }),
    }),
};