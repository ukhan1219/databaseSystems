const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./User");  // Import the User model
const Rso = require("./Rso");    // Import the Rso model (will be created later)
const University = require("./University"); // Import University model (will be created later)

const Event = sequelize.define("Event", {
    event_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    event_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    event_type: {
        type: DataTypes.ENUM("public", "private", "rso"),
        allowNull: false
    },
    event_category: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    event_description: {
        type: DataTypes.TEXT
    },
    event_date: {
        type: DataTypes.DATEONLY,  // Stores only the date
        allowNull: false
    },
    event_time: {
        type: DataTypes.TIME,  // Stores only the time
        allowNull: false
    },
    location_name: {
        type: DataTypes.STRING(255)
    },
    latitude: {
        type: DataTypes.DECIMAL(9, 6)
    },
    longitude: {
        type: DataTypes.DECIMAL(9, 6)
    },
    google_place_id: {  // New field for Google Maps
        type: DataTypes.STRING(100),
        allowNull: true
    },
    contact_phone: {
        type: DataTypes.STRING(20)
    },
    contact_email: {
        type: DataTypes.STRING(255)
    }
}, {
    tableName: "event",
    timestamps: false
});

// Relationships
Event.belongsTo(User, { foreignKey: "approved_by", as: "approvedBy" }); // SuperAdmin approval
Event.belongsTo(Rso, { foreignKey: "rso_id", as: "rso" }); // Links to an RSO
Event.belongsTo(University, { foreignKey: "university_id", as: "university" }); // Links to a university

module.exports = Event;
