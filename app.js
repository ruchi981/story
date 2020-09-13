const express=require("express");
const mongoose=require("mongoose");
const Blog=require("./models/blog");
const Comment=require("./models/comment");
const methodOverride=require("method-override");
const passport=require("passport");
const cookieParser=require("cookie-parser");
const nodemailer=require("nodemailer");
const async=require("async");
const crypto=require("crypto");
const flash=require("connect-flash")
const LocalStrategy=require("passport-local");
const User = require("./models/user");
const port=process.env.PORT || 4000;
const app=express();

app.set("view engine","ejs");

mongoose.connect("mongodb://localhost/blogspot",{useNewUrlParser:true,useUnifiedTopology:true}).then(()=>{
    console.log("connected to mongodb");
})
//PASSPORT config
app.use(require("express-session")({
    secret:"Iamruchipanda",
    resave:false,
    saveUninitialized:false
}))

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(express.urlencoded({extended:true}))
app.use(methodOverride("_method"));
app.use(cookieParser('secret'));
app.use(flash());
app.use(express.static("public"));


app.use(function(req,res,next){
    res.locals.currentUser=req.user;
    res.locals.error=req.flash("error");
    res.locals.success=req.flash("success");
    next();
})

//IMAGE UPLOAD
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'dciviehz0', 
  api_key: "477551596338111", 
  api_secret: "m9a-tuAmV8hxyB33kmWsFmyT7VI"
});
//LANDING PAGE
app.get("/",(req,res)=>{
    res.render("landing");
})

//=========================================================
//AUTH ROUTES
//=========================================================
app.get("/register",(req,res)=>{
    res.render("register")
})

app.post("/register", upload.single('image'),(req,res)=>{
    
    var newUser=new User({
       username:req.body.username,
       avatar:req.body.avatar,
       firstName:req.body.firstName,
       lastName:req.body.lastName,
       email:req.body.email
    })
     //the passport local mongoose uses .register to register and automatically password is used
     User.register(newUser,req.body.password,function(err,user){
         if(err){
             console.log(err);
             req.flash("error","This username already exists!")
             res.redirect("/register");
         }
         
             passport.authenticate("local")(req,res,function(err){
                 if(err){
                     console.log(err)
                 }
                 req.flash("success","Welcome to Storybooks!!")
                 res.redirect("/blogs");
             })
         
     })
})

//LOGIN USER-get the form
app.get("/login",(req,res)=>{
    res.render("login");
})

//LOGIN USER using local strategy
app.post("/login",passport.authenticate("local",{
    
    
    successRedirect:"/blogs",
    failureRedirect:"/login"
}),function(req,res){

})


//LOGOUT USER
app.get("/logout",(req,res)=>{
    req.logout();
    req.flash("success","Successfully logged out! Do visit again")
    res.redirect("/blogs");

})

//FIND A PARTICULAR USER PROFILE
app.get("/user/:id",(req,res)=>{
    User.findById(req.params.id,function(err,foundUser){
        if(err){
            console.log(err);
            req.flash("error","Something went wrong");
            res.redirect("back")
        }
        else{
            res.render("users/show",{user:foundUser});
        }
    })
})

//FORGOT PASSWORD
app.get("/forgot",(req,res)=>{
    res.render("forgot")
})

app.post('/forgot', function(req, res, next) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ email: req.body.email }, function(err, user) {
          if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgot');
          }
  
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user: 'ruchipanda7@gmail.com',
            pass: "Arati1234!"
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'ruchipanda7@gmail.com',
          subject: 'Node.js Password Reset',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          console.log('mail sent');
          req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
          done(err, 'done');
        });
      }
    ], function(err) {
      if (err) return next(err);
      res.redirect('/forgot');
    });
  });
  
  app.get('/reset/:token', function(req, res) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('reset', {token: req.params.token});
    });
  });
  
  app.post('/reset/:token', function(req, res) {
    async.waterfall([
      function(done) {
        User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
          if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
          }
          if(req.body.password === req.body.confirm) {
            user.setPassword(req.body.password, function(err) {
              user.resetPasswordToken = undefined;
              user.resetPasswordExpires = undefined;
  
              user.save(function(err) {
                req.logIn(user, function(err) {
                  done(err, user);
                });
              });
            })
          } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect('back');
          }
        });
      },
      function(user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user: 'ruchipanda7@gmail.com',
            pass: "Arati1234!"
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'ruchipanda7@gmail.com',
          subject: 'Your password has been changed',
          text: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      }
    ], function(err) {
      res.redirect('/blogs');
    });
  });

//==========================================================
//BLOG ROUTES
//==========================================================

//GET ALL THE BLOGS
app.get("/blogs",(req,res)=>{
    Blog.find({},function(err,blogs){
        if(err){
            console.log(err)
        }else{
            res.render("blogs/all",{blogs:blogs,currentUser:req.user});
        }
    })
    
})

//GET A FORM TO ADD NEW BLOG
app.get("/blogs/new",isLoggedIn,(req,res)=>{
    res.render("blogs/new");
})

//POST A BLOG
//app.post("/blogs",isLoggedIn,upload.single('image'),async(req,res)=>{
//     var title=req.body.title;
//     var caption=req.body.caption;
//     var description=req.body.description;
//     var author={
//         id:req.user._id,
//         username:req.user.username
//     }
//     var newBlog={title:title,caption:caption,description:description,author:author}
   
//     Blog.create(newBlog,function(err,newlyCreated){
//         if(err){
//             console.log(err)
//         }
//         else{
//             req.flash("success","Blog created successfully!!")
//             res.redirect("/blogs")
//         }
//     })
    
// })
app.post("/blogs",isLoggedIn, upload.single('image'), function(req, res) {
    cloudinary.uploader.upload(req.file.path, function(result) {
        // if (err) {
        //     req.flash("error", "Can't upload image, try again later.");
        //     res.redirect("back");
        // }
      // add cloudinary url for the image to the campground object under image property
      
      req.body.blog.image = result.secure_url;
      // add author to campground
      req.body.blog.author = {
         id: req.user._id,
        username: req.user.username
       }
       Blog.create(req.body.blog, function(err, blog) {
        if (err) {
            console.log(err);
          req.flash('error', err.message);
          return res.redirect('back');
        }
    res.redirect('/blogs/'+blog.id);
      });
     });
});


//GET A BLOG BY ID
app.get("/blogs/:id",isLoggedIn,(req,res)=>{
   
    Blog.findById(req.params.id).populate("comments").exec(function(err,blog){
        if(err){
            console.log(err)
        }
        else{
            res.render("blogs/show",{blog:blog});
        }
    })
})

//GET A FORM TO EDIT A BLOG
// app.get("/blogs/:id/edit",blogOwner,(req,res)=>{
//     Blog.findById(req.params.id,function(err,blog){
//         if(err){
//             console.log(err)
//         }
//         else{
//             res.render("blogs/edit",{blog:blog});
            
//         }
//     })
    
// })

//UPDATE A BLOG
// app.put("/blogs/:id",blogOwner,(req,res)=>{
//     Blog.findByIdAndUpdate(req.params.id,req.body,function(err,blog){
//         if(err){
//             console.log(err)
//         }
//         else{
//             console.log(blog)
//             res.redirect("/blogs");
//         }
//     })
// })

//
// app.put("/blogs/:id", blogOwner,upload.single('image'), function(req, res){
//   Blog.findById(req.params.id, async function(err, blog){
//       if(err){
//           req.flash("error", err.message);
//           res.redirect("back");
//       } else {
//           if (req.file) {
//             try {
//                 await cloudinary.v2.uploader.destroy(blog.imageId);
//                 var result = await cloudinary.v2.uploader.upload(req.file.path);
//                 blog.imageId = result.public_id;
//                 blog.image = result.secure_url;
//             } catch(err) {
//                 req.flash("error", err.message);
//                 return res.redirect("back");
//             }
//           }
//           blog.title = req.body.title;
//           blog.description = req.body.description;
//           blog.save();
//           req.flash("success","Successfully Updated!");
//           res.redirect("/blogs/" + blog._id);
//       }
//   });
// });


//DELETE A BLOG
app.delete("/blogs/:id",blogOwner,(req,res)=>{
    Blog.findByIdAndRemove(req.params.id,function(err,blog){
        if(err){
            console.log(err)
        }
        else{
            console.log(blog);
            res.redirect("/blogs")
        }
    })
})

//====================================================
//COMMENT ROUTES
//====================================================

//GET A FORM TO ADD COMMENT
app.get("/blogs/:id/comments/new",isLoggedIn,(req,res)=>{
    Blog.findById(req.params.id,function(err,blog){
        if(err){
            console.log(err);

        }
        res.render("comments/new",{blog:blog});
    })
    
})

app.post("/blogs/:id/comments",(req,res)=>{
    Blog.findById(req.params.id,function(err,blog){
        if(err){
            console.log(err);
            
        }
        else{
            Comment.create(req.body,function(err,comment){
                if(err){
                    console.log(err)
                }
                else{
                    //add username and id to comment
                    comment.author.username=req.user.username;
                    comment.author.id=req.user._id;
                    comment.save();

                    blog.comments.push(comment);
                    blog.save();
                    
                   
                    req.flash("success","Comment added successfully!!")
                    res.redirect("/blogs/"+ req.params.id);
                
                }
            })
        }
    })

})

// app.delete("/blogs/:id/comments/:comment_id",commentOwner,(req,res)=>{

 
//     Comment.findByIdAndRemove(req.params.comment_id,function(err){
//         if(err){
//             console.log(err)
//         }
//         else{
//            res.redirect("/blogs/"+ req.params.id);
//         }
      
//     })
  
// })




//middleware to check if user is logged in then only he can see protected routes
function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error","Please login!")
    res.redirect("/login")
}


//function for authorization of blog
function blogOwner(req,res,next){
    if(req.isAuthenticated()){
        Blog.findById(req.params.id,function(err,blog){
            if(err){
                console.log(err);
                console.log("blog not found");
                req.flash("error","Something went wrong..Try again later")
                res.redirect("/blogs");
            }else{
                if(blog.author.id.equals(req.user._id)){
                    next();
                }
                else{
                    console.log("you dnt have permission to do that");
                    req.flash("error","Oops!! You dont have permission to do that")
                    res.redirect("/blogs")
                }
            }
        })
    }
    else{
        console.log("you need to be logged in");
        req.flash("error","Please login to proceed!")
        res.redirect("/login")
    }
}


//function for authorization of comment
function commentOwner(req,res,next){
    if(req.isAuthenticated()){
        Comment.findById(req.params.comment_id,function(err,comment){
            if(err){
                console.log(err);
                res.redirect("back")
            
            }else{
                if(comment.author.id.equals(req.user._id)){
                    next();
                }
                else{
                    console.log("no permission to do that");
                    res.send("back")
                }
            }
        })
    }else{
        console.log("you need to be logged in to do that");
        res.redirect("/login")
    }
}







app.listen(port,()=>{
    console.log("server started");
})