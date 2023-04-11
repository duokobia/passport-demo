require('dotenv').config();
const bcrypt = require("bcrypt");
const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");

const MongoDBStore = require('connect-mongodb-session')(session)

var store = new MongoDBStore({
  uri: process.env.MONGO_URI,
  collection: 'sessions'
});

// Catch errors
store.on('error', function (error) {
  console.log(error);
});

const Schema = mongoose.Schema;


const mongoDb = process.env.MONGO_URI;
mongoose.connect(mongoDb, { useUnifiedTopology: true, useNewUrlParser: true });
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));



//TO-DO
// Bcrypt code block not working

passport.use(
    new LocalStrategy(async(username, password, done) => {
      try {
        const user = await User.findOne({ username: username });
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        };
        if (user.password !== password) {
          return done(null, false, { message: "Incorrect password" });
        };
        return done(null, user);
      } catch(err) {
        return done(err);
      };
    })
);

// passport.use(
//   new LocalStrategy((username, password, done) => {
//     User.findOne({ username: username })
//       .then((user) => {
//         if (!user) {
//           return done(null, false, { message: "Incorrect username" });
//         }
//         bcrypt.compare(password, user.password, (err, result) => {
//           if (result) {
//             return done(null, user);
//           } else {
//             return done(null, false, { message: "Incorrect password" });
//           }
//         });
//       })
//       .catch((err) => {
//         return done(err);
//       });
//   })
// );

// passport.use(
//   new LocalStrategy(async(username, password, done) => {
//     try {

//       const user = await User.findOne({ username: username });

//       if (!user) {
//         return done(null, false, { message: "Incorrect username" });
//       };

//       bcrypt.compare(password, user.password, (err, res) => {
//         if (res) {
//           // passwords match! log user in
//           return done(null, user)
//         } else {
//           // passwords do not match!
//           return done(null, false, { message: "Incorrect password" })
//         }
//       }) 
//     } catch(err) {
//       return done(err);
//     };
//   })
// );


passport.serializeUser(function(user, done) {
    done(null, user.id);
});
  
passport.deserializeUser(async function(id, done) {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch(err) {
        done(err);
    };
});

const User = mongoose.model(
  "User",
  new Schema({
    username: { type: String, required: true },
    password: { type: String, required: true }
  })
);

const app = express();
app.set("views", __dirname);
app.set("view engine", "ejs");

app.use(session({
  secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true,
  store: store
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

app.use(function(req, res, next) {
  res.locals.currentUser = req.user;
  next();
});

// Middleware
const authMiddleware = (req, res, next) => {
  if (!req.user) {
    if (!req.session.messages) {
      req.session.messages = [];
    }
    req.session.messages.push("You can't access that page before logon.");
    res.redirect('/');
  } else {
    next();
  }
}

// Routes

app.get("/", (req, res) => {
  let messages = [];
  if (req.session.messages) {
    messages = req.session.messages;
    req.session.messages = [];
  }
  res.render("index", { messages });
});

app.get("/sign-up", (req, res) => res.render("sign-up-form"));

app.get("/log-out", (req, res) => {
  req.session.destroy(function (err) {
    res.redirect("/");
  });
});

app.get('/restricted', authMiddleware, (req, res) => {
  if (!req.session.pageCount) {
    req.session.pageCount = 1;
  } else {
    req.session.pageCount++;
  }
  res.render('restricted', { pageCount: req.session.pageCount });
})

// app.post("/sign-up", async (req, res, next) => {
//     try {
//       const user = new User({
//         username: req.body.username,
//         password: req.body.password
//       });
//       const result = await user.save();
//       res.redirect("/");
//     } catch(err) {
//       return next(err);
//     };
// });

app.post("/sign-up", async (req, res, next) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    await User.create({ username: req.body.username, password: hashedPassword });
    res.redirect("/");
  } catch (err) {
    return next(err);
  }
});

app.post(
    "/log-in",
    passport.authenticate("local", {
      successRedirect: "/",
      failureRedirect: "/",
      failureMessage: true
    })
);

app.listen(3000, () => console.log("app listening on port 3000!"));