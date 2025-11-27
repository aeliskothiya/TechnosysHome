import mongoose from "mongoose";

const subscriptionPackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Package name is required"],
    maxlength: [100, "Package name cannot exceed 100 characters"],
    trim: true
  },
  coins: {
    type: Number,
    required: [true, "Coins count is required"],
    min: [1, "Coins must be at least 1"]
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: [0, "Price cannot be negative"]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    maxlength: [500, "Description cannot exceed 500 characters"],
    trim: true
  }
}, {
  timestamps: true
});

// Create index for better query performance
subscriptionPackageSchema.index({ isActive: 1, price: 1 });

const SubscriptionPackage = mongoose.model("SubscriptionPackage", subscriptionPackageSchema);

export default SubscriptionPackage;