import mongoose from "mongoose";

const technicianBankDetailsSchema = new mongoose.Schema({
  TechnicianID: { type: mongoose.Schema.Types.ObjectId, ref: "Technician", required: true },
  BankAccountNo: { type: String, maxlength: 30 },
  IFSCCode: { type: String, maxlength: 20 },
}, { timestamps: true });

const TechnicianBankDetails = mongoose.model("TechnicianBankDetails", technicianBankDetailsSchema);

export default TechnicianBankDetails;
