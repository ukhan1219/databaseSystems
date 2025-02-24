const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DATABASE_NAME,
  process.env.DATABASE_USER,
  process.env.DATABASE_PASSWORD,
  {
    host: process.env.DATABASE_HOST,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true, // Enable SSL for secure connection
        rejectUnauthorized: false, // Required for some cloud providers
      },
    },
  }
);

module.exports = sequelize;
