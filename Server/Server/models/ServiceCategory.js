import mongoose from "mongoose";

const serviceCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 100, unique: true },
    isActive: { type: Boolean, default: true },
    // Optional image path (served from /uploads/categories)
    image: { type: String, default: null },
  },
  { timestamps: true }
);

const ServiceCategory = mongoose.model("ServiceCategory", serviceCategorySchema);

export default ServiceCategory;
