import mongoose from "mongoose";

const subServiceCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 200, unique: true },
    // Reference to parent service category
    serviceCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceCategory",
      required: true,
    },
    // Optional description for the sub-service
    description: { type: String,required: true, default: "", maxlength: 1000 },
    price: { type: Number, required: true, default: 0 },
    // Number of coins required from customer to accept a booking for this sub-service
    coinsRequired: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
    // Optional image path (served from /uploads/categories or similar)
    image: { type: String, default: null },
  },
  { timestamps: true }
);   

const SubServiceCategory = mongoose.model(
  "SubServiceCategory",
  subServiceCategorySchema
);

export default SubServiceCategory;
