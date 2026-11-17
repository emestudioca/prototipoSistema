import { NextRequest } from "next/server";
import { connectDB } from "@gestionate/core/server";
import Sale, { getCapturedSale } from "@gestionate/sales/server";
import CashRegister from "./model";

export function withRegisterTracking(handler: Function) {
  return async (req: NextRequest, ctx?: unknown) => {
    const res = await handler(req, ctx);
    const captured = getCapturedSale(req);
    if (captured) {
      const register = await CashRegister.findOne({ status: "abierta" });
      if (register) {
        await Sale.findByIdAndUpdate(captured.saleId, {
          cashRegister: register._id,
        });
        register.totalSales = (register.totalSales || 0) + captured.total;
        await register.save();
      }
    }
    return res;
  };
}

export async function listRegisters() {
  try {
    await connectDB();
    const registers = await CashRegister.find({})
      .sort({ createdAt: -1 })
      .limit(50);
    return Response.json({ registers });
  } catch (error) {
    console.error("Get registers error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function openRegister(
  req: NextRequest,
  _ctx: unknown,
  user: { id: string; name: string }
) {
  try {
    await connectDB();
    const { openingAmount } = await req.json();

    const activeRegister = await CashRegister.findOne({ status: "abierta" });
    if (activeRegister) {
      return Response.json(
        { error: "Ya existe una caja abierta" },
        { status: 400 }
      );
    }

    const register = await CashRegister.create({
      openedBy: user.id,
      openedByName: user.name,
      openingAmount: openingAmount || 0,
      status: "abierta",
    });

    return Response.json({ register }, { status: 201 });
  } catch (error) {
    console.error("Open register error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function closeRegister(
  req: NextRequest,
  _ctx: unknown,
  user: { id: string; name: string }
) {
  try {
    await connectDB();
    const { closingAmount, notes } = await req.json();

    const register = await CashRegister.findOne({ status: "abierta" });
    if (!register) {
      return Response.json({ error: "No hay caja abierta" }, { status: 400 });
    }

    const sales = await Sale.find({
      cashRegister: register._id,
      createdAt: { $gte: register.createdAt },
    });

    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const expectedAmount = register.openingAmount + totalSales;
    const difference = closingAmount !== undefined
      ? closingAmount - expectedAmount
      : 0;

    register.closedBy = user.id;
    register.closedByName = user.name;
    register.closingAmount = closingAmount;
    register.expectedAmount = expectedAmount;
    register.difference = difference;
    register.totalSales = totalSales;
    register.status = "cerrada";
    (register as unknown as { closedAt: Date }).closedAt = new Date();
    register.notes = notes;

    await register.save();
    return Response.json({ register });
  } catch (error) {
    console.error("Close register error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}