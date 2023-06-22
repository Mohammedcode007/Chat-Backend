const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const crypto = require('crypto');

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
    passwordConfirm:{
        type: String

    },
    PaaswordChangedAt: {
        type: Date
    },
    passwordResetToken: {
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
        default: false
    },
    otp: {
        type: Number
    },
    otp_expiry_time: {
        type: Date
    }
});


userSchema.pre("save", async function (next) {

    // الشرط الاول يتحقق اذا لم يتم تعديلها او القيمه فارغه يكمل البكود 
    if (!this.isModified("password") || !this.password) return next();
    // اذا وجد الباسورد يقوم بتشفيره
    this.password = await bcrypt.hash(this.password, 12);


    next();
});

// داله تقوم بالتحقق من كلمه المرور صحيحه ام لا
useSchema.methods.correctpassword = async function (canditatePassword, userPassword) {
    //"candidatePassword": هو كلمة المرور المرشحة التي يتم ارسالها للتحقق.
    //"userPassword": هو كلمة المرور المستخدمة المخزنة في قاعدة البيانات.
    //
    return await bcrypt.compare(canditatePassword, userPassword)
}

//اله تقوم بالتحقق من otp المستخدمه متطابقه مع التي تم ارساله الى المستخدم

userSchema.methods.correctOTP = async function (candidateOTP, userOTP) {
    //"candidateOTP": يُمثل رمز OTP المرشح الذي يتم إرساله للتحقق.
    //"userOTP": يُمثل رمز OTP المستخدم المخزن في قاعدة البيانات.

    return await bcrypt.compare(candidateOTP, userOTP);
};


userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString("hex");
  
    this.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
  
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
    return resetToken;
  };


  userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
    if (this.passwordChangedAt) {
      const changedTimeStamp = parseInt(
        this.passwordChangedAt.getTime() / 1000,
        10
      );
      return JWTTimeStamp < changedTimeStamp;
    }
  
    // FALSE MEANS NOT CHANGED
    return false;
  };
  
// Compile the schema into a model
const User = mongoose.model("User", useSchema);

module.exports = User