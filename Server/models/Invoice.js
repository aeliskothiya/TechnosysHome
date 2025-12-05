import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  // ref_type indicates which collection ref_id points to
  ref_type: {
    type: String,
    enum: ["CustomerPayment", "SubscriptionPayment", "AdminPayout"],
    required: true,
  },
  ref_id: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "ref_type" },
  invoice_pdf: { type: String, required: true },
}, { timestamps: true });

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
