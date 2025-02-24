const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Assuming you have a database config file

const User = sequelize.define('User', {
    user_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('super_admin', 'admin', 'student'),
        allowNull: false,
        defaultValue: 'student'
    },
    university_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'universities', // Adjust based on your actual table name
            key: 'university_id'
        },
        onDelete: 'SET NULL'
    }
}, {
    tableName: 'user',
    timestamps: false // Disable timestamps if not needed
});

module.exports = User;
