import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    // Allow creating customer with only mobile; name can be updated later
    Name: { type: String, maxlength: 100, default: "" },

    Mobile: { type: String, required: true, unique: true, maxlength: 15 },
    Email: { type: String, unique: true, sparse: true, maxlength: 100 },

    // Structured address fields (optional so registration can be mobile-only)
    Address: {
      houseNumber: { type: String, default: "" },
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      pincode: { type: String, default: "" },
    },

    // For geolocation based matching
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
  },
  { timestamps: true }
);

customerSchema.index({ location: "2dsphere" });

export default mongoose.model("Customer", customerSchema);
