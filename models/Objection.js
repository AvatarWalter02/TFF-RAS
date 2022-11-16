import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const objectionSchema = new mongoose.Schema({
  clubId: {
    type: String,
    required: [true, "No club ID!"],
    unique: true,
    validate: {
        validator: validator.isMongoId,
        message: "Club ID is not valid!"
    },

  },
  clubName: {
    type: String,
    required: [true, "No club Name"],
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, "Please provide password"],
    minlength: 6,
    select: false,
  }
});

// UserSchema.pre("save", async function () {
//   // console.log(this.modifiedPaths());
//   if (!this.isModified("password")) return;
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
// });

// UserSchema.methods.createJWT = function () {
//   return jwt.sign({ userId: this._id }, process.env.JWT_SECRET, {
//     expiresIn: process.env.JWT_LIFETIME,
//   });
// };

// UserSchema.methods.comparePassword = async function (candidatePassword) {
//   const isMatch = await bcrypt.compare(candidatePassword, this.password);
//   return isMatch;
// };

export default mongoose.model("User", UserSchema);
