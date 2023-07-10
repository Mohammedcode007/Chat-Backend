const asyncHandler = require("express-async-handler");
const Message = require("../modules/messageModel");
const User = require("../modules/userModel");
const Chat = require("../modules/chatModel");

//@description     Get all Messages
//@route           GET /api/Message/:chatId
//@access          Protected
const allMessages = asyncHandler(async (req, res) => {
    try {
      const messages = await Message.find({ chat: req.body.chatId }) // تعليق: البحث عن جميع الرسائل التي تنتمي إلى الدردشة المحددة
        .populate("sender", "name pic email") // تعليق: جلب بيانات المرسل (الاسم والصورة والبريد الإلكتروني)
        .populate("chat"); // تعليق: جلب بيانات الدردشة
  
      res.json(messages); // تعليق: إرجاع جميع الرسائل كإجابة
    } catch (error) {
      res.status(400);
      throw new Error(error.message); // تعليق: رمي خطأ في حالة حدوث خطأ أثناء المعالجة
    }
  });
  

//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
const sendMessage = asyncHandler(async (req, res) => {
    const { content, chatId } = req.body;
  
    if (!content || !chatId) {
      console.log("Invalid data passed into request"); // تعليق: التحقق من صحة البيانات المرسلة في الطلب
      return res.sendStatus(400);
    }
  
    var newMessage = {
      sender: req.user._id, // تعليق: معرف المرسل
      content: content, // تعليق: محتوى الرسالة
      chat: chatId, // تعليق: معرف الدردشة
    };
  
    try {
      var message = await Message.create(newMessage); // تعليق: إنشاء رسالة جديدة في قاعدة البيانات
  
      message = await message.populate("sender", "name pic"); // تعليق: جلب بيانات المرسل (الاسم والصورة)
      message = await message.populate("chat"); // تعليق: جلب بيانات الدردشة
      message = await User.populate(message, {
        path: "chat.users",
        select: "name pic email",
      }); // تعليق: جلب بيانات المستخدمين المرتبطين بالدردشة
  
      await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message }); // تعليق: تحديث آخر رسالة في الدردشة
  
      res.json(message); // تعليق: إرجاع الرسالة المنشأة كإجابة
    } catch (error) {
      res.status(400);
      throw new Error(error.message); // تعليق: رمي خطأ في حالة حدوث خطأ أثناء المعالجة
    }
  });
  

module.exports = { allMessages, sendMessage };