const express = require('express');
const db = require('./database/db');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes')
const messageRoutes = require('./routes/messageRoutes')

const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// تفعيل طريقة التحليل للطلبات من نوع application/json
app.use(express.json());

// استخدام التوجيهات المرتبطة بالتسجيل وتسجيل الدخول
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);


// Error Handling middlewares

// تطبيق وسيط خطأ للتعامل مع الأخطاء غير المتوقعة
app.use(notFound);

// تطبيق وسيط خطأ للتعامل مع الأخطاء
app.use(errorHandler);

// تشغيل الخادم على المنفذ 3000
const server =app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

// تكوين Socket.io مع الخادم
const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "*",
    // credentials: true,
  },
});

// التعامل مع اتصالات Socket.io الواردة
io.on("connection", (socket) => {
  console.log("Connected to socket.io");

  // استقبال حدث "setup" لتكوين الاتصال
  socket.on("setup", (userData) => {
      socket.join(userData._id);
      console.log(userData?._id, "userid");
   

    // إرسال حدث "connected" لتأكيد تأسيس الاتصال
    socket.emit("connected");
  });

  // استقبال حدث "join chat" لانضمام العميل إلى غرفة المحادثة المحددة
  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });

  // استقبال حدث "new message" وإرساله إلى المستخدمين الآخرين في الغرفة المناسبة
  socket.on("new message", (newMessageRecieved) => {
    console.log( newMessageRecieved);

    var chat = newMessageRecieved?.chat;
    console.log( newMessageRecieved);
    if (!chat || !chat.users) {
      return console.log("chat أو chat.users غير معرّفة");
    }

    chat.users.forEach((user) => {
      if (user._id === newMessageRecieved.sender._id) return;

      socket.emit("new message", newMessageRecieved);
    });
  });


    // استقبال حدث "new message" وإرساله إلى المستخدمين الآخرين في الغرفة المناسبة



  // socket.on("new message", (newMessageRecieved) => {
  //   console.log( newMessageRecieved);

  //   socket.emit("new message",newMessageRecieved)

  
  // });
  // حدث فصل الاتصال عند قطع العميل الاتصال
  socket.on("disconnect", () => {
    console.log("تم فصل العميل");
 
  });
});

