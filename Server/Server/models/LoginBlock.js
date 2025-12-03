import mongoose from "mongoose";

const loginBlockSchema = new mongoose.Schema({
  Email: { type: String, required: true, unique: true },
  AttemptCount: { type: Number, required: true, default: 0 },
  BlockedUntil: { type: Date, default: null },
}, { timestamps: true });

const LoginBlock = mongoose.models.LoginBlock || mongoose.model("LoginBlock", loginBlockSchema);

export default LoginBlock;
