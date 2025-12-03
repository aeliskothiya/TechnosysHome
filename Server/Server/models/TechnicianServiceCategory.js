import mongoose from "mongoose";

const technicianServiceCategorySchema = new mongoose.Schema({
  TechnicianID: { type: mongoose.Schema.Types.ObjectId, ref: "Technician", required: true },
  ServiceCategoryID: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceCategory", required: true },
}, { timestamps: true });

const TechnicianServiceCategory = mongoose.model("TechnicianServiceCategory", technicianServiceCategorySchema);

export default TechnicianServiceCategory;
