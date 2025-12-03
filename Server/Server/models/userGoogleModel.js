import mongoose from "mongoose";

const userGoogleSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    picture: { type: String, default: "" }
  },
  { timestamps: true }
);

const UserGoogle =
  mongoose.models.UserGoogle || mongoose.model("UserGoogle", userGoogleSchema);

export default UserGoogle;
