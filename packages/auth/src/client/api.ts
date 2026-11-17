import { request } from "@gestionate/core/client";
import { IUser, Role } from "@gestionate/core/shared";

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: IUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (body: { name: string; email: string; password: string; role: Role }) =>
    request<{ user: IUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  me: () => request<{ user: IUser }>("/auth/me"),
};