// Secrets/app.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const findOrCreate = require("mongoose-findorcreate");
//const encrypt = require("mongoose-encryption");
//const bcrypt = require("bcrypt");
//const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const _ = require("lodash");
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

const dbHost = process.env.DB_HOST
const dbPort = process.env.DB_PORT
const dbUser = process.env.DB_USER
const dbPass = process.env.DB_PASS
const dbName = process.env.DB_NAME
const appPort = process.env.APP_PORT

const uri = "mongodb://" + dbHost + ":" + dbPort + "/" + dbName;
//const uri = "mongodb+srv://" + dbUser + ":" + dbPass + "@cluster0.25aqz.mongodb.net/" + dbName + "?retryWrites=true&w=majority";
mongoose.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true });

let port = process.env.PORT;
if (port == null || port == "") { port = appPort; };
app.listen(port, ()=>{ console.log("Server started on port: " + port); });

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  secret: String
});
//userSchema.plugin(encrypt,{secret: passwordKey, encryptedFields: ["password"]});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());
//passport.serializeUser(User.serializeUser());
//passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function(err, user){
      return cb(err, user);
    });
  }
));

app.get("/", (req,res)=>{
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" } ),
  (req, res)=>{ res.redirect("/secrets"); }
);

app.get("/login", (req,res)=>{
  res.render("login");
});

app.get("/register", (req,res)=>{
  res.render("register");
});

app.get("/secrets", (req,res)=>{
  User.find({"secret": {$ne: null}}, (err, foundUsers)=>{
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
  // if (req.isAuthenticated()) {
  //   res.render("secrets");
  // } else {
  //   res.redirect("/login");
  // }
});

app.post("/submit", (req,res)=>{
  const submittedSecret = req.body.secret;

  User.findById(req.user.id, (err, foundUser)=>{
    if (err) {
      console.log(err);
    } else {
      foundUser.secret = submittedSecret;
      foundUser.save();
      res.redirect("/secrets");
    }
  });
});

app.get("/submit", (req,res)=>{
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/register",(req,res)=>{
  User.register({username: req.body.username}, req.body.password, (err,user)=>{
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req,res,()=>{
        res.redirect("/secrets");
      });
    }
  });

  // bcrypt.hash(req.body.password, saltRounds, (err,hash)=>{
  //   const newUser = new User({
  //     username: req.body.username,
  //     password: hash
  //   });
  //   newUser.save((err)=>{
  //     if (err) {
  //       res.send(err);
  //     } else {
  //       //res.send("Success - User account created!");
  //       res.render("secrets");
  //     }
  //   });
  // });
});

app.get("/logout",(req,res)=>{
  req.logout();
  res.redirect("/");
});

app.post("/login",(req,res)=>{
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, (err)=>{
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, ()=>{
        res.redirect("/secrets");
      })
    }
  })

  // const username = req.body.username;
  // const password = req.body.password;
  // User.findOne({username: username},(err,foundUser)=>{
  //   if (!foundUser) {
  //     res.send("Username not found.");
  //   } else {
  //     bcrypt.compare(password, foundUser.password, (err,result)=>{
  //       if (result === true) {
  //         res.render("secrets");
  //       } else {
  //         res.send("Error logging in.");
  //       }
  //     });
  //   }
  // });
});
