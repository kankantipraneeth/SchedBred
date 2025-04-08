import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import fs from "fs";

import nodemailer from "nodemailer";
import http from "http";

const app = express();
const port = 3000;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.post("/signup", (req, res) => {
  let users = [];

  // ✅ Check if file exists and read it safely
  if (fs.existsSync("data.json")) {
    try {
      users = JSON.parse(fs.readFileSync("data.json", "utf8"));
    } catch (err) {
      console.error("Error parsing JSON:", err);
      return res.status(500).json({ message: "Error reading JSON file" });
    }
  }

  // ✅ Create new user object
  const newUser = {
    id: Date.now(),
    username: req.body.logname,
    email: req.body.logemail,
    password: req.body.logpass,
  };

  // ✅ Append new user to the array
  users.push(newUser);

  // ✅ Use fs.writeFileSync() properly
  try {
    fs.writeFileSync("data.json", JSON.stringify(users, null, 2));
    console.log("User added:", newUser);

    // ✅ Read updated data and log it
    const data = JSON.parse(fs.readFileSync("data.json", "utf-8"));
    console.log("Updated data:", data);

    // ✅ Send response after writing is complete
    res.json({ message: "Signup successful!", user: newUser });
  } catch (err) {
    console.error("Error writing to file:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/signin", (req, res) => {
  const logemail = req.body.logemail;
  const logpass = req.body.logpass;
  if (!fs.existsSync("data.json")) {
    return res
      .status(404)
      .json({ message: "No users found. Please sign up first." });
  }
  const users = JSON.parse(fs.readFileSync("data.json", "utf8"));
  const user = users.find((u) => u.email == logemail);
  // console.log(user);
  // if (user) {
  //   res.json({ message: "userFound!", user });
  // } else {
  //   res.status(401).json({ message: "User not found" });
  // }
  let isAuthenticated = user && user.password === logpass;
  console.log("Authentication Status:", isAuthenticated);

  if (isAuthenticated) {
    // return res.json({ message: "Login successful!", user });
    return res.redirect(
      `/timetable?username=${user.username}&email=${user.email}&userId=${user.id}`
    );
  } else {
    let errorMessage = "Invalid email or password.";

    // return res.status(401).json({ message: "Invalid email or password." });
    return res.render("index.ejs", { message: errorMessage });
  }

  // if (isAuthenticated) {
  //   if (user.timetable && Object.keys(user.timetable).length === days.length) {
  //     // If timetable already fully filled, go to planner
  //     return res.redirect(`/planner?userId=${user.id}`);
  //   } else {
  //     // Otherwise, continue with timetable entry
  //     return res.redirect(
  //       `/timetable?step=1&username=${user.username}&email=${user.email}&userId=${user.id}`
  //     );
  //   }
  // }
});
const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

let timetable = {};

app.get("/timetable", (req, res) => {
  let userId = parseInt(req.query.userId);
  let step = parseInt(req.query.step) || 1;

  let lengthDays = days.length;
  let currentDay = days[step - 1];
  let subjects = [];

  if (fs.existsSync("data.json")) {
    let users = JSON.parse(fs.readFileSync("data.json", "utf8"));
    let user = users.find((u) => u.id == userId);

    if (user && user.timetable && user.timetable[currentDay]) {
      subjects = user.timetable[currentDay];
    }
  }
  res.render("timetable.ejs", {
    i: step,
    lengthDays: lengthDays,
    currentDay: currentDay,
    subjects: subjects,
    userId: userId,
  });
});

app.post("/save-timetable", (req, res) => {
  let { step, subjects, userId } = req.body;
  userId = Number(userId);

  if (!step || !Array.isArray(subjects) || !userId) {
    return res.status(400).json({ message: "Invalid data format" });
  }

  let currentDay = days[step - 1];

  fs.readFile("data.json", "utf8", (err, data) => {
    if (err) return res.status(500).json({ message: "Failed to read data" });

    // let users = JSON.parse(data);
    // let user = users.find((u) => u.id === userId);

    let users = JSON.parse(fs.readFileSync("data.json", "utf8"));
    let user = users.find((u) => u.id == userId);

    if (!user)
      return res.status(404).json({ message: `User${userId} not found.` });

    if (!user.timetable) user.timetable = {};
    user.timetable[currentDay] = subjects;

    fs.writeFile("data.json", JSON.stringify(users, null, 2), (err) => {
      if (err)
        return res.status(500).json({ message: "Failed to save timetable." });

      res.json({ message: "Timetable saved successfully." });
    });
  });
});

app.get("/planner", (req, res) => {
  let userId = req.query.userId;
  let lengthDays = days.length;
  userId = Number(userId);
  let timetable = {};

  let saved = req.query.saved === "true";

  if (fs.existsSync("data.json")) {
    const users = JSON.parse(fs.readFileSync("data.json", "utf8"));
    const user = users.find((u) => u.id === userId);
    if (user && user.timetable) {
      timetable = user.timetable;
    }
    console.log(timetable);
  }
  let day = Object.keys(timetable);
  let subjects = timetable[day];
  res.render("planner.ejs", {
    userId,
    timetable,
    lengthDays,
    saved,
  });
});

app.post("/save-requirements", (req, res) => {
  let userId = req.body.userId;
  userId = Number(userId);
  const requirements = req.body.requirements;
  const notificationTime = req.body.notificationTime;
  let timetable = {};

  if (!fs.existsSync("data.json")) {
    return res.status(404).json({ message: "user not found" });
  }

  let users = JSON.parse(fs.readFileSync("data.json", "utf8"));
  let user = users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  user.requirements = requirements;
  user.notificationTime = notificationTime;

  fs.writeFile("data.json", JSON.stringify(users, null, 2), (err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to save requirements." });
    }
    res.json({ message: "Requirements saved Successfully!" });
  });
});

app.post("/send-mail", (req, res) => {
  let userId = req.body.userId;
  userId = Number(userId);

  if (!fs.existsSync("data.json")) {
    res.status(404).json({ message: "user not found" });
  }

  let users = JSON.parse(fs.readFileSync("data.json", "utf8"));
  let user = users.find((u) => u.id === userId);

  const targetMail = user.email;
  const senderMail = "praneeth.bunny2003@gmail.com";

  const date = new Date();
  let dayIndex = date.getDay(); // returns num ranging from 0 - 6 0 for sunday and so on

  let nextDayIndex = (dayIndex + 1) % 7;
  let nextDayName = days[nextDayIndex];

  let nextDayReq = user.requirements[nextDayName];
  console.log(`Current day is: ${days[nextDayIndex - 1]}`);
  console.log("Next Day Requirements: ", nextDayReq);

  const server = http.createServer((req, res) => {
    const auth = nodemailer.createTransport({
      service: "gmail",
      secure: "true",
      port: 465,
      auth: {
        user: senderMail,
        pass: "lessSecurePass",
      },
    });

    const receiver = {
      from: senderMail,
      to: targetMail,
      subject: "Notification Remainder from SchedBred",
      test: nextDayReq,
    };

    auth.sendMail(receiver, (err, res) => {
      if (err) throw err;
      console.log("success!");
      res.end();
    });
  });
});

// function sendMail() {
//   let userId = req.body.userId;
//   userId = Number(userId);

//   if (!fs.existsSync(data.json)) {
//     res.status(404).json({ message: "user not found" });
//   }

//   let users = JSON.parse(fs.readFileSync("data.json", "utf8"));
//   let user = users.find((u) => u.id === userId);

//   const targetMail = user.email;
//   const senderMail = "praneeth.bunny2003@gmail.com";

//   const date = new Date();
//   let dayIndex = date.getDay(); // returns num ranging from 0 - 6 0 for sunday and so on

//   let nextDayIndex = (dayIndex + 1) % 7;
//   let nextDayName = days[nextDayIndex];

//   let nextDayReq = user.requirements[nextDayName];

//   console.log("Next Day Requirements: ", nextDayReq);

//   const server = http.createServer((req, res) => {
//     const auth = nodemailer.createTransport({
//       service: "gmail",
//       secure: "true",
//       port: 465,
//       auth: {
//         user: senderMail,
//         pass: "lessSecurePass",
//       },
//     });

//     const receiver = {
//       from: senderMail,
//       to: targetMail,
//       subject: "Notification Remainder from SchedBred",
//       test: nextDayReq,
//     };

//     auth.sendMail(receiver, (err, res) => {
//       if (err) throw err;
//       console.log("success!");
//       res.end();
//     });
//   });
// }

app.listen(port, (req, res) => {
  console.log(`Server is running on the port ${port}`);
});
