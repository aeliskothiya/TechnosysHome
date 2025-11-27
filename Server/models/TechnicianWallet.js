import mongoose from "mongoose";

const technicianWalletSchema = new mongoose.Schema({
  TechnicianID: { type: mongoose.Schema.Types.ObjectId, ref: "Technician", required: true },
  BalanceCoins: { type: Number, default: 0 },
  LastUpdate: { type: Date, default: Date.now },
}, { timestamps: true });

const TechnicianWallet = mongoose.model("TechnicianWallet", technicianWalletSchema);

export default TechnicianWallet;
