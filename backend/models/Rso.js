const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./User");  // Import User model

const Rso = sequelize.define("Rso", {
    rso_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    rso_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: false  // Default is inactive until conditions are met
    }
}, {
    tableName: "rso",
    timestamps: false
});

// Relationships
Rso.belongsTo(User, { foreignKey: "admin_user_id", as: "admin" });

module.exports = Rso;
