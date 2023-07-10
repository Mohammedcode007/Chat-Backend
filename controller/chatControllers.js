const asyncHandler = require("express-async-handler");
const User = require("../modules/userModel");
const Chat = require("../modules/chatModel");

//@description     Create or fetch One to One Chat
//@route           POST /api/chat/
//@access          Protected
const accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  // التحقق مما إذا كانت قيمة userId موجودة في الطلب
  if (!userId) {
    console.log("UserId param not sent with request");
    return res.status(400).send("user not found");
  }

  // البحث عن الدردشة
  var isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  // ملء بيانات الدردشة
  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name pic email",
  });

  // التحقق مما إذا كانت هناك دردشة موجودة أم لا
  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    // إنشاء دردشة جديدة إذا لم يتم العثور على دردشة موجودة
    var chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        "users",
        "-password"
      );
      res.status(200).json(FullChat);
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  }
});


//@description     Fetch all chats for a user
//@route           GET /api/chat/
//@access          Protected
const fetchChats = asyncHandler(async (req, res) => {
  try {
    // البحث عن الدردشات المتعلقة بالمستخدم الحالي
    Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate("users", "-password") // جلب بيانات المستخدمين واستبعاد حقل كلمة المرور
      .populate("groupAdmin", "-password") // جلب بيانات مشرفي المجموعة واستبعاد حقل كلمة المرور
      .populate("latestMessage") // جلب بيانات آخر رسالة
      .sort({ updatedAt: -1 }) // ترتيب النتائج حسب تاريخ التحديث بتنازلي
      .then(async (results) => {
        // ملء بيانات آخر رسالة
        results = await User.populate(results, {
          path: "latestMessage.sender",
          select: "name pic email",
        });
        res.status(200).send(results); // إرسال النتائج كاستجابة
      });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});


//@description     Create New Group Chat
//@route           POST /api/chat/group
//@access          Protected
const createGroupChat = asyncHandler(async (req, res) => {
  // التحقق مما إذا تم تقديم قيمة المستخدمين واسم الدردشة في الطلب
  if (!req.body.users || !req.body.name) {
    return res.status(400).send({ message: "Please Fill all the feilds" });
  }

  // تحويل قيمة المستخدمين إلى كائن من النص
  var users = JSON.parse(req.body.users);

  // التحقق مما إذا كان هناك أكثر من مستخدمين واحد لتشكيل دردشة جماعية
  if (users.length < 2) {
    return res
      .status(400)
      .send("More than 2 users are required to form a group chat");
  }

  // إضافة المستخدم الحالي إلى قائمة المستخدمين في الدردشة الجماعية
  users.push(req.user);

  try {
    // إنشاء دردشة جماعية جديدة
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      groupAdmin: req.user,
    });

    // جلب بيانات الدردشة الجماعية بالكامل مع بيانات المستخدمين ومشرف المجموعة
    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(200).json(fullGroupChat); // إرسال بيانات الدردشة الجماعية كاستجابة
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});


// @desc    Rename Group
// @route   PUT /api/chat/rename
// @access  Protected
const renameGroup = asyncHandler(async (req, res) => {
  // استخراج قيمة chatId و chatName من جسم الطلب
  const { chatId, chatName } = req.body;

  // تحديث اسم الدردشة باستخدام chatId المقدم
  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      chatName: chatName,
    },
    {
      new: true,
    }
  )
    .populate("users", "-password") // جلب بيانات المستخدمين واستبعاد حقل كلمة المرور
    .populate("groupAdmin", "-password"); // جلب بيانات مشرف المجموعة واستبعاد حقل كلمة المرور

  // التحقق مما إذا كانت الدردشة قد تم تحديثها بنجاح
  if (!updatedChat) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(updatedChat); // إرسال بيانات الدردشة المحدثة كاستجابة
  }
});


// @desc    Remove user from Group
// @route   PUT /api/chat/groupremove
// @access  Protected
const removeFromGroup = asyncHandler(async (req, res) => {
  // استخراج قيمة chatId و userId من جسم الطلب
  const { chatId, userId } = req.body;

  // التحقق مما إذا كان المُطلب هو المشرف
  // يمكن إضافة الشرط هنا للتحقق من صلاحيات المستخدم قبل الاستمرار في العملية

  // إزالة المستخدم من المجموعة باستخدام chatId المقدم و userId المقدم
  const removed = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password") // جلب بيانات المستخدمين واستبعاد حقل كلمة المرور
    .populate("groupAdmin", "-password"); // جلب بيانات مشرف المجموعة واستبعاد حقل كلمة المرور

  // التحقق مما إذا تمت إزالة المستخدم بنجاح
  if (!removed) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(removed); // إرسال بيانات الدردشة المحدثة كاستجابة
  }
});


const addToGroup = asyncHandler(async (req, res) => {
  // استخراج قيمة chatId و userId من جسم الطلب
  const { chatId, userId } = req.body;

  // التحقق مما إذا كان المُطلب هو المشرف
  // يمكن إضافة الشرط هنا للتحقق من صلاحيات المستخدم قبل الاستمرار في العملية

  // إضافة المستخدم إلى المجموعة باستخدام chatId المقدم و userId المقدم
  const added = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password") // جلب بيانات المستخدمين واستبعاد حقل كلمة المرور
    .populate("groupAdmin", "-password"); // جلب بيانات مشرف المجموعة واستبعاد حقل كلمة المرور

  // التحقق مما إذا تمت إضافة المستخدم بنجاح
  if (!added) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(added); // إرسال بيانات الدردشة المحدثة كاستجابة
  }
});

module.exports = {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
};