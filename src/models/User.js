import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    verified: { type: Boolean, default: false },
    otp: { type: Number, default: null },
    otpExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Hide sensitive fields before sending to client
userSchema.methods.toJSONSafe = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.otp;
  delete obj.otpExpiresAt;
  return obj;
};

// Helper method for OTP validation (optional)
userSchema.methods.isOtpValid = function (enteredOtp) {
  return (
    this.otp === parseInt(enteredOtp) &&
    this.otpExpiresAt &&
    this.otpExpiresAt > new Date()
  );
};

const User = mongoose.model("User", userSchema);
export default User;
