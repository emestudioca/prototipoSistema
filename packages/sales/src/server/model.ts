import mongoose, { Schema, Document } from "mongoose";

export interface ISaleItemDoc {
  product: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  price: number;
  cost: number;
  subtotal: number;
}

export interface ISaleDoc extends Document {
  items: ISaleItemDoc[];
  total: number;
  costTotal: number;
  profit: number;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  seller: mongoose.Types.ObjectId;
  sellerName: string;
  cashRegister?: mongoose.Types.ObjectId;
}

const SaleItemSchema = new Schema<ISaleItemDoc>({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  cost: { type: Number, required: true },
  subtotal: { type: Number, required: true },
});

const SaleSchema = new Schema<ISaleDoc>(
  {
    items: [SaleItemSchema],
    total: { type: Number, required: true },
    costTotal: { type: Number, required: true },
    profit: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["efectivo", "tarjeta", "transferencia"],
      default: "efectivo",
    },
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sellerName: { type: String, required: true },
    cashRegister: { type: Schema.Types.ObjectId, ref: "CashRegister" },
  },
  { timestamps: true }
);

SaleSchema.index({ createdAt: -1 });
SaleSchema.index({ seller: 1 });

export default mongoose.models.Sale || mongoose.model<ISaleDoc>("Sale", SaleSchema);