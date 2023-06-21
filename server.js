const app = require("./app")
const dotenv = require("dotenv")
const mongoose = require("mongoose")

dotenv.config({ path: "./config.env" })
process.on("uncaughtException", (error) => {
    console.log(error);
})

const http = require("http")

const server = http.createServer(app)

const DB = process.env.DBURL.replace("password", process.env.DBPASSWORD)

mongoose.connect(DB, {
    useNewUrlParser: true,
    // useCreateIndex: true,
    useUnifiedTopology: true
}).then((con) => {
    console.log("DB connection successful");
}).catch((error) => {
    console.log(error);
});


const port = process.env.PORT || 8000


server.listen(port, () => {
    console.log(`app is running on port ${port}`)
})


process.on("unhandledRejection", (error) => {
    console.log(error);
    server.close(() => {
        process.exit(1);

    });
})