require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const postgres = require("postgres");

const app = express();
const PORT = process.env.PORT || 3000;

// Create a connection to Postgres
const sql = postgres({
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: "require",
});

// Test the database connection
async function connectToDatabase() {
  try {
    // Running a simple query to test the connection
    const result = await sql`SELECT NOW() as now`;
    console.log("Connected to PostgreSQL at:", result[0].now);
  } catch (error) {
    console.error("Error connecting to PostgreSQL:", error);
    process.exit(1);
  }
}
connectToDatabase();

app.use(cors());
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS",
  );
  next();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
