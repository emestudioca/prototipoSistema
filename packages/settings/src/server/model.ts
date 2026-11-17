import mongoose, { Schema, Document } from "mongoose";

export interface ISettingDoc extends Document {
  key: string;
  value: unknown;
}

const SettingSchema = new Schema<ISettingDoc>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Setting ||
  mongoose.model<ISettingDoc>("Setting", SettingSchema);