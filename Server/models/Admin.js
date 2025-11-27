import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, maxlength: 50 },
    password: { type: String, required: true, maxlength: 255 }, 
  },
  { timestamps: true }
);

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
