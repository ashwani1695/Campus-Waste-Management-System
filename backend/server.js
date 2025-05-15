const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDatabase = require('./config/db');
const path = require('path');

dotenv.config();
connectDatabase();
const app = express();

app.use(cors({
  origin: 'http://localhost:5300',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "../Frontend")));
//routes
app.use("/auth", require("./routes/authRoute"));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../Frontend/homepage/homepage.html"));
});

const port = process.env.PORT;

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});