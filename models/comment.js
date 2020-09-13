const mongoose=require("mongoose");

const commentSchema=new mongoose.Schema({
    text:{
        type:String
    },
    author:{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        username:String
    }
})

const Comment=mongoose.model("Comment",commentSchema);

module.exports=Comment;