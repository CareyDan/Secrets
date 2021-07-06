// Secrets/app.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const _ = require("lodash");
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const dbHost = process.env.DB_HOST
const dbPort = process.env.DB_PORT
const dbUser = process.env.DB_USER
const dbPass = process.env.DB_PASS
const dbName = process.env.DB_NAME
const passwordKey = process.env.PASSWORD_KEY
const appPort = process.env.APP_PORT

const uri = "mongodb://" + dbHost + ":" + dbPort + "/" + dbName;
//const uri = "mongodb+srv://" + dbUser + ":" + dbPass + "@cluster0.25aqz.mongodb.net/" + dbName + "?retryWrites=true&w=majority";
mongoose.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true });

let port = process.env.PORT;
if (port == null || port == "") { port = appPort; };
app.listen(port, ()=>{ console.log("Server started on port: " + port); });

const userSchema = new mongoose.Schema({
  username: String,
  password: String
});
userSchema.plugin(encrypt,{secret: passwordKey, encryptedFields: ["password"]});
const User = mongoose.model("User",userSchema);

app.get("/", (req,res)=>{
  res.render("home");
});

app.get("/login", (req,res)=>{
  res.render("login");
});

app.get("/register", (req,res)=>{
  res.render("register");
});

app.post("/register",(req,res)=>{
  const newUser = new User({
    username: req.body.username,
    password: req.body.password
  });
  newUser.save((err)=>{
    if (err) {
      res.send(err);
    } else {
      //res.send("Success - User account created!");
      res.render("secrets");
    }
  });
});

app.post("/login",(req,res)=>{
  const username = req.body.username;
  const password = req.body.password;
  User.findOne({username: username},(err,foundUser)=>{
    if (!foundUser) {
      res.send("Username not found.");
    } else {
      if (password === foundUser.password) {
        res.render("secrets");
      } else {
        res.send("Error logging in.");
      }
    }
  });
});
