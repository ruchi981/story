const mongoose=require("mongoose");
const passportLocalMongoose=require("passport-local-mongoose")
const userSchema=new mongoose.Schema({
    username:{
        type:String
    },
    password:String,
    avatar:String,
    firstName:String,
    lastName:String,
    email:
    { type:String,
    unique:true,
    required:true
},resetPasswordToken:String,
resetPasswordExpires:Date

    
   
})

//this adds some method to our User like register
userSchema.plugin(passportLocalMongoose)


const User=mongoose.model('User',userSchema);
module.exports=User