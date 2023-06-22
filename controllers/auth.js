var jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator')
// هذه الداله لانشاء توكين من يوزر اى دي
const signToken = (userID) => jwt({ userID }, process.env.JWT_SECRET)
const User = require("../models/user");
const filterObj = require('../Utils/filterObj');
const crypto = require('crypto');
const { promisify } = require("util");

//Register New User

exports.register = async (req, res, next) => {

    //يتم استخراج البيانات الواردة في جسم الطلب (req.body) وتخزينها في متغيرات محلية (FirstName, LastName, Email, PassWord).
    const { FirstName, LastName, Email, PassWord } = req.body;
    //يتم استدعاء دالة "filterObj" لتصفية (فلترة) البيانات في req.body واستخلاص الحقول المحددة فقط (FirstName, LastName, PassWord, Email). والنتيجة تخزن في متغير محلي بإسم "filterBody".
    const filterBody = filterObj(req.body, "FirstName", "LastName", "PassWord", "Email")

    // بالبريد المرسل يتم البحث في قاعده البيانات  
    const Existing_User = await User.findOne({ Email: Email })

    // اذا وجد البريد في قاعده البيانات وايضا قيميه Verified == true  اذا البريد موجود وقم بتسجبل الدخول
    if (Existing_User && Existing_User.Verified) {
        res.status(400).json({
            status: "Error",
            message: " Email Already is use , Please Login"
        })
        // في حاله else if اذا وجد البريد في قاعده البيانات 
    } else if (Existing_User) {
        // اذا وجد البريد في قاعده البيانات وايضا قيميه Verified == false  اذا البريد موجود وقم بتسجبل الدخول
        // يتم استكمال التسجيل واستخلاص الحقول باستخدام داله فلتر 
        const Update_user = await User.findOneAndUpdate({ Email: Email }, filterBody, { new: true, validateModifiedOnle: true })
        req.userID === Existing_User._id
        next()

    } else {
        //إذا لم يتم العثور على مستخدم موجود بنفس البريد الإلكتروني، يتم إنشاء مستخدم جديد باستخدام بيانات "filterBody" باستخدام دالة "create"، ويتم إرسال استجابة بحالة نجاح 200.
        const new_user = await User.create(filterBody)
        req.userID === new_user._id
        next()
    }

    //تم تعريف دالة "sendOTP" بعد نهاية دالة "register"، وتقوم بإرسال رمز التحقق OTP للمستخدم.
    const sendOTP = async (req, res, next) => {
        const { userID } = req;
        const new_otp = otpGenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });
        const otp_expiry_time = Date.now() + 10 * 60 * 1000

        await User.findByIdAndUpdate(userID, {
            otp: new_otp,
            otp_expiry_time,
        })

    }

    res.status(200).json({
        status: "Success",
        message: "OTP send Successfully",
        token,
    })
}


exports.verifyOTP = catchAsync(async (req, res, next) => {
    // verify otp and update user accordingly
    const { email, otp } = req.body;
    const user = await User.findOne({
        email,
        otp_expiry_time: { $gt: Date.now() },
    });

    if (!user) {
        return res.status(400).json({
            status: "error",
            message: "Email is invalid or OTP expired",
        });
    }

    if (user.verified) {
        return res.status(400).json({
            status: "error",
            message: "Email is already verified",
        });
    }

    if (!(await user.correctOTP(otp, user.otp))) {
        res.status(400).json({
            status: "error",
            message: "OTP is incorrect",
        });

        return;
    }

    // OTP is correct

    user.verified = true;
    user.otp = undefined;
    await user.save({ new: true, validateModifiedOnly: true });

    const token = signToken(user._id);

    res.status(200).json({
        status: "success",
        message: "OTP verified Successfully!",
        token,
        user_id: user._id,
    });
});



exports.login = async (req, res, next) => {
    const { Email, PassWord } = req.body;


    if (!Email || !PassWord) {
        res.status(400).json({
            status: "Error",
            message: " Please Both Email and Password is Required"
        })
    }

    const userDoc = await User.findOne({ Email: Email }).select("+PassWord")

    if (!userDoc, !(await userDoc.correctpassword(PassWord, userDoc.PassWord))) {
        res.status(400).json({
            status: "Error",
            message: " Email Or PassWord not Correct"
        })
    }

    const token = signToken(userDoc._id)


    res.status(200).json({
        status: "Success",
        message: "Logged in Successfully",
        token,
    })

}




exports.protect = catchAsync(async (req, res, next) => {
    // 1) Getting token and check if it's there
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return res.status(401).json({
            message: "You are not logged in! Please log in to get access.",
        });
    }
    // 2) Verification of token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    console.log(decoded);

    // 3) Check if user still exists

    const this_user = await User.findById(decoded.userId);
    if (!this_user) {
        return res.status(401).json({
            message: "The user belonging to this token does no longer exists.",
        });
    }
    // 4) Check if user changed password after the token was issued
    if (this_user.changedPasswordAfter(decoded.iat)) {
        return res.status(401).json({
            message: "User recently changed password! Please log in again.",
        });
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = this_user;
    next();
});




exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return res.status(404).json({
            status: "error",
            message: "There is no user with email address.",
        });
    }

    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // 3) Send it to user's email
    try {
        const resetURL = `http://localhost:3000/auth/new-password?token=${resetToken}`;
        // TODO => Send Email with this Reset URL to user's email address

        console.log(resetURL);

        mailService.sendEmail({
            from: "shreyanshshah242@gmail.com",
            to: user.email,
            subject: "Reset Password",
            html: resetPassword(user.firstName, resetURL),
            attachments: [],
        });

        res.status(200).json({
            status: "success",
            message: "Token sent to email!",
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return res.status(500).json({
            message: "There was an error sending the email. Try again later!",
        });
    }
});






exports.resetPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on the token
    const hashedToken = crypto
        .createHash("sha256")
        .update(req.body.token)
        .digest("hex");

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
        return res.status(400).json({
            status: "error",
            message: "Token is Invalid or Expired",
        });
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // 3) Update changedPasswordAt property for the user
    // 4) Log the user in, send JWT
    const token = signToken(user._id);

    res.status(200).json({
        status: "success",
        message: "Password Reseted Successfully",
        token,
    });
});