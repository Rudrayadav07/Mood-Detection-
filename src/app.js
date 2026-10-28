const express = require("express")
const app = express()
const songsRoutes = require("./routes/songs.route")


app.use(express.json())

app.use("/",songsRoutes)




module.exports = app