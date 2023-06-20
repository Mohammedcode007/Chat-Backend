const { log } = require("console")
const app = require("./app")
const http = require("http")

const server = http.createServer()

const port = process.env.PORT  || 8000


server.listen(port,(port)=>{
    console.log(`app is running on port ${port}`)
})