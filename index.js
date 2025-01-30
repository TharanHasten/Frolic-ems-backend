const express = require("express");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const multer = require("multer");


const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());


// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// MongoDB connection
const mongourl = "mongodb+srv://tharana2023it:tharan057@backend.qp2kl.mongodb.net/EmsDB";
mongoose
  .connect(mongourl)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// User schema
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const Users = mongoose.model("Users", userSchema);

// Event schema
const eventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
});

const Events = mongoose.model("Events", eventSchema);

// Register endpoint
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "Please fill all the fields" });
  }

  const userExist = await Users.findOne({ email });
  if (userExist) {
    return res.status(400).json({ message: "User with this email already exists" });
  }

  const cryptPass = await bcrypt.hash(password, 8);
  const newUser = new Users({
    id: uuidv4(),
    username,
    email,
    password: cryptPass,
  });

  await newUser.save();
  return res.status(201).json({ message: "User registered successfully" });
});

// Login endpoint
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await Users.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "User not found. Register first" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ email }, "event-management", { expiresIn: "1h" });

  return res.status(200).json({ message: "Login successful", token });
});

app.get("/api/login_details/:email",authenticationToken,async (req,res)=>{
    const {email}=req.params;

    const user = await Credential.findOne({email});
    if(!user){
        return res.status(400).json({message:"No user"});
    }
    return res.status(201).json({"password":user.password});

});

// Authentication middleware
function authenticationToken(req, res, next) {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token not found" });
  }

  jwt.verify(token, "event-management", (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }
    req.user = user;
    next();
  });
}

// Get all users endpoint (Protected)
app.get("/api/getAll", authenticationToken, async (req, res) => {
  const allUsers = await Users.find().select("-password"); 
  return res.status(200).json(allUsers);
});

// Create event endpoint
app.post("/api/create/event", upload.single("image"), async (req, res) => {
  const { title, date, time, location, description } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!title || !date || !time || !location || !description) {
    return res.status(400).json({ message: "Please fill all the required fields" });
  }

  const newEvent = new Events({
    id: uuidv4(),
    title,
    date,
    time,
    location,
    description,
    image,
  });

  await newEvent.save();
  return res.status(201).json({ message: "Event created successfully" });
});

// Get all events endpoint
app.get("/api/getAll/events", async (req, res) => {
  const allEvents = await Events.find();
  return res.status(200).json(allEvents);
});

// Update event endpoint
app.put("/api/update/event/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { title, date, time, location, description } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!id) {
    return res.status(400).json({ message: "Event ID is required" });
  }

  const updatedFields = {};
  if (title) updatedFields.title = title;
  if (date) updatedFields.date = date;
  if (time) updatedFields.time = time;
  if (location) updatedFields.location = location;
  if (description) updatedFields.description = description;
  if (image) updatedFields.image = image;

  const updatedEvent = await Events.findOneAndUpdate({ id }, updatedFields, { new: true });

  if (!updatedEvent) {
    return res.status(404).json({ message: "Event not found" });
  }

  return res.status(200).json({ message: "Event updated successfully", updatedEvent });
});


// Delete event endpoint
app.delete("/api/delete/event/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Event ID is required" });
    }
  
    const deletedEvent = await Events.findOneAndDelete({ id });
  
    if (!deletedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }
  
    return res.status(200).json({ message: "Event deleted successfully" });
  });

  app.get("/api/get/event/:id", async (req, res) => {
    const { id } = req.params;
  
    if (!id) {
      return res.status(400).json({ message: "Event ID is required" });
    }
  
    const event = await Events.findOne({ id });
  
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
  
    return res.status(200).json(event);
  });

  app.get("/api/getAll/event", async (req, res) => {
    const allEvents = await Events.find();
    return res.status(200).json(allEvents);
  });
