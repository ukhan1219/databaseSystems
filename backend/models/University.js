const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const University = sequelize.define("University", {
    university_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    location: {
        type: DataTypes.STRING(255)
    },
    description: {
        type: DataTypes.TEXT
    },
    number_of_students: {
        type: DataTypes.INTEGER
    },
    pictures: {
        type: DataTypes.STRING(512)  // Store image URLs or paths
    }
}, {
    tableName: "university",
    timestamps: false
});

module.exports = University;
