const express = require("express")
const morgan = require("morgan")  // Http request logger middelware node js
const rateLimit = require("express-rate-limit")  // تحديد عدد معين من طلبات الارسال خلال وقت معين
const helmet = require("helmet") //مكتبة "Helmet" في Node.js هي مكتبة تستخدم لتعزيز أمان تطبيقات الويب. تعمل هذه المكتبة على توفير وسائل حماية إضافية لتطبيقك من التهديدات الأمنية المشتركة مثل هجمات حقن البرمجيات الخبيثة وهجمات Cross-Site Scripting (XSS) وهجمات Cross-Site Request Forgery (CSRF) وغيرها.
const mongoSanitize = require('express-mongo-sanitize'); //مكتبة Express Mongoose Sanitize هي مكتبة تساعد على تنظيف وتطهير البيانات المدخلة قبل تخزينها في قاعدة البيانات باستخدام إطار العمل Express.js ومكتبة Mongoose. تهدف هذه المكتبة إلى حماية التطبيقات من هجمات الحقن ومشاكل الأمان المتعلقة بمعالجة البيانات المستخدمة.
const bodyParser = require('body-parser');//تحليل البيانات المستلمه قبل تخزينها فى السيرفر 
const xss = require("xss"); //استخدام مكتبة XSS في تطبيق Node.js يساعد على ضمان سلامة التطبيق من هجمات XSS
const cors = require("cors") //بشكل عام، مكتبة CORS في Node.js تُستخدم للتعامل مع قيود المشاركة بين المصادر وتمكين التواصل الآمن والسلس بين تطبيقات الويب التي تعمل على نطاقات مختلفة.



//app.use() يستخدم لتطبيق وسيط (middleware) على التطبيق الخاص بك.


const app = express()

app.use(express.urlencoded({ extended: true }))  //express.urlencoded() هو وسيط (middleware) يوفره express لتحليل بيانات الجسم بتنسيق URL-encoded.
app.use(mongoSanitize())
// app.use(xss())
app.use(express.json({ limit: "10kb" }))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))  //bodyParser.urlencoded() هو وسيط (middleware) يوفره body-parser لتحليل بيانات الجسم بتنسيق URL-encoded.
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    credentials: true
}))


app.use(helmet())

// حاله if اذا كنا في مرحله التطوير يعمل كود مورجان
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"))

}
const Limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // in one hourrs
    max: 3000, // Limit each IP to 3000 requests per `window` (here, per one hour)
    message: 'Too many accounts created from this IP, please try again after an hour',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})



app.use("/tawk", Limiter) // تطبيق Limiter as middleware 




module.exports = app