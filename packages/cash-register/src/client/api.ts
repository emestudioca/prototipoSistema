import { request } from "@gestionate/core/client";
import { ICashRegister } from "@gestionate/core/shared";

export const api = {
  getRegisters: () =>
    request<{ registers: ICashRegister[] }>("/cash-register"),
  openRegister: (openingAmount: number) =>
    request<{ register: ICashRegister }>("/cash-register", {
      method: "POST",
      body: JSON.stringify({ openingAmount }),
    }),
  closeRegister: (closingAmount: number, notes?: string) =>
    request<{ register: ICashRegister }>("/cash-register/close", {
      method: "POST",
      body: JSON.stringify({ closingAmount, notes }),
    }),
};