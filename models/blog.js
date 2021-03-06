const mongoose=require("mongoose");



const blogSchema=new mongoose.Schema({
    title:{
        type:String,
       
    },
    
    image:{
        type:String
    },
    imageId: String,
   description:{
       type:String,
       required:true
       
   },
   location:{
       type:String,
       required:true

   },
   peak:{
       type:String,
       required:true
   },
   attraction:{
       type:String,
       required:true
   },
   contact:{
       type:Number,
       required:true
   },


//    publishDate:{
//        type:String,
//    }

   author:{
    id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    username:String
},
   //here we are saying comment property would be an array 
   comments:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Comment"
}]

})

const Blog=mongoose.model("Blog",blogSchema);

module.exports=Blog;