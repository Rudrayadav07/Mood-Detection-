const mongoose  =require("mongoose");

const songSchema = new mongoose.Schema({
    title:String,
    Artist:String,
    Audio:String
})

const song = mongoose.model("song",songSchema);

module.exports = song