import { request } from "@gestionate/core/client";
import { IUser, Role } from "@gestionate/core/shared";

export const api = {
  getUsers: () =>
    request<{ users: (IUser & { active: boolean; createdAt: string })[] }>(
      "/users"
    ),
  createUser: (body: { name: string; email: string; password: string; role: Role }) =>
    request<{ user: IUser }>("/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateUser: (id: string, body: Partial<IUser>) =>
    request<{ user: IUser }>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteUser: (id: string) =>
    request<{ message: string }>(`/users/${id}`, { method: "DELETE" }),
};