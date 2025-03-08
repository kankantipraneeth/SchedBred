import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import fs from "fs";
const app = express();
const port = 3000;

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
    return res.json({ message: "Login successful!", user });
  } else {
    let errorMessage = "Invalid email or password.";

    // return res.status(401).json({ message: "Invalid email or password." });
    return res.render("index.ejs", { message: errorMessage });
  }
});

app.listen(port, (req, res) => {
  console.log(`Server is running on the port ${port}`);
});
