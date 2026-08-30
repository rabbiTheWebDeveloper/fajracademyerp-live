import mongoose, { Schema } from "mongoose";

const roleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true, default: "" },
    usersCount: { type: Number, default: 0 },
    permissions: [{ type: String }],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const RoleModel = mongoose.models.Role ?? mongoose.model("Role", roleSchema);
