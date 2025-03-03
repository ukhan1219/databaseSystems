const express = require("express");
const cors = require("cors");
require("dotenv").config();
const authRoutes = require("./routes/auth");
const sequelize = require("./config/db");
const User = require("./models/User");

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await sequelize.sync(); // Ensures tables are created
    console.log("Database synchronized.");

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error("Error syncing database:", error);
  }
})();
