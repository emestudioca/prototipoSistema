import mongoose, { Schema, Document } from "mongoose";

export interface IProductDoc extends Document {
  name: string;
  description: string;
  price: number;
  cost: number;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  image?: string;
  active: boolean;
  attributes: Record<string, unknown>;
}

const ProductSchema = new Schema<IProductDoc>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    cost: { type: Number, required: true, min: 0 },
    sku: { type: String, required: true, unique: true, trim: true },
    category: { type: String, default: "General", trim: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    minStock: { type: Number, default: 5 },
    image: { type: String },
    active: { type: Boolean, default: true },
    attributes: { type: Map, of: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.Product ||
  mongoose.model<IProductDoc>("Product", ProductSchema);