import { DataTypes } from 'sequelize';
import { sequelize } from '../db/connect_to_sqldb.js';

const User = sequelize.define(
  'User',
  {
    // UUID consistent with post.model.js
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // unique username for each user
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    // unique email for each user
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    // Password field (hashed in practice, but just a string here for simplicity)
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // SHA-256 hash of the raw reset token (raw token is sent by email, never stored)
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // expiry timestamp for the reset token
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    // modern pattern — excludes password from all queries by default
    defaultScope: {
      attributes: { exclude: ['password'] },
    },
    // unscoped() available when password IS needed e.g. sign in
    scopes: {
      withPassword: {
        attributes: { include: ['password'] },
      },
    },
    indexes: [
      { fields: ['username'] }, // fast username lookup on sign in
      { fields: ['email'] },    // fast email lookup on register
    ],
  }
);

export { User };
