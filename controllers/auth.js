var jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator')
// هذه الداله لانشاء توكين من يوزر اى دي
const signToken = (userID) => jwt({ userID }, process.env.JWT_SECRET)
const User = require("../models/user");
const filterObj = require('../Utils/filterObj');


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