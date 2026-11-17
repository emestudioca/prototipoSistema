import mongoose, { Schema, Document } from "mongoose";

export interface ICashRegisterDoc extends Document {
  openedBy: mongoose.Types.ObjectId;
  openedByName: string;
  closedBy?: mongoose.Types.ObjectId;
  closedByName?: string;
  openingAmount: number;
  closingAmount?: number;
  expectedAmount?: number;
  difference?: number;
  totalSales: number;
  totalExpenses: number;
  status: "abierta" | "cerrada";
  notes?: string;
}

const CashRegisterSchema = new Schema<ICashRegisterDoc>(
  {
    openedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    openedByName: { type: String, required: true },
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    closedByName: { type: String },
    openingAmount: { type: Number, required: true, min: 0 },
    closingAmount: { type: Number },
    expectedAmount: { type: Number },
    difference: { type: Number },
    totalSales: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["abierta", "cerrada"],
      default: "abierta",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

CashRegisterSchema.index({ status: 1 });
CashRegisterSchema.index({ createdAt: -1 });

export default mongoose.models.CashRegister ||
  mongoose.model<ICashRegisterDoc>("CashRegister", CashRegisterSchema);