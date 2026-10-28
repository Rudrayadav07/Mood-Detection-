const express = require("express")
const multer = require("multer")
const router = express.Router()

const upload = ({storage:multer.memoryStorage()})


router.post("/songs",upload.single("audio"),(req,res)=>{
    console.log(req.body);
    console.log(req.file);
    
res.status(201).json({
 message:"song created successfully",
 song: req.body
   
    
})
    
})

module.exports = router