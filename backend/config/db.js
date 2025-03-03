const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(process.env.PSQL, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Necessary for cloud-hosted PostgreSQL
    },
  },
  logging: false, // Set to true for debugging SQL queries
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Connected to PostgreSQL using Sequelize.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
})();

module.exports = sequelize;
