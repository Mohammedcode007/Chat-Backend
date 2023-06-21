const mongoose = require("mongoose");
const bcrypt = require('bcrypt');

const useSchema = mongoose.Schema({
    FirstName: {
        type: String,
        required: [true, "First Name is required"]
    },
    LastName: {
        type: String,
        required: [true, "Last Name is required"]
    },
    Avatar: {
        type: String
    },
    Email: {
        type: String,
        required: [true, "Email is required"],
        validate: {
            validator: function (value) {
                // Email validation regex
                const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
                return emailRegex.test(value);
            },
            message: "Invalid email format"
        }
    },
    Paasword: {
        type: String
    },
    PaaswordChangedAt: {
        type: Date
    },
    PaaswordResetToken: {
        type: String
    },
    PaaswordResetExpires: {
        type: Date
    },
    CreatedAt: {
        type: Date
    },
    UpdatedAt: {
        type: Date
    },
    Verified: {
        type: Boolean,
        default:false
    },
    otp:{
        type:Number
    },
    otp_expiry_time:{
        type:Date
    }
});


userSchema.pre("save", async function (next) {
    // Only run this function if password was actually modified
    if (!this.isModified("password") || !this.password) return next();
  
    // Hash the password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);
  
    //! Shift it to next hook // this.passwordChangedAt = Date.now() - 1000;
  
    next();
  });
  

useSchema.methods.correctpassword = async function (canditatePassword,userPassword) {
    return await bcrypt.compare(canditatePassword,userPassword)
}

userSchema.methods.correctOTP = async function (candidateOTP, userOTP) {
    return await bcrypt.compare(candidateOTP, userOTP);
  };

// Compile the schema into a model
const User = mongoose.model("User", useSchema);

module.exports = User