import { request } from "@gestionate/core/client";
import { ICategory } from "@gestionate/core/shared";

export const api = {
  getCategories: () =>
    request<{ categories: ICategory[] }>("/categories"),
  createCategory: (body: { name: string; color?: string }) =>
    request<{ category: ICategory }>("/categories", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteCategory: (id: string) =>
    request<{ message: string }>(`/categories/${id}`, { method: "DELETE" }),
};