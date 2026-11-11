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
    // Password field is nullable — users authenticate via Google SSO (OAuth2 Proxy)
    // and have no local password. Kept only in case a non-SSO account type is added later.
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    // excludes password from all queries by default
    defaultScope: {
      attributes: { exclude: ['password'] },
    },
    indexes: [
      { fields: ['username'] },
      { fields: ['email'] }, // fast email lookup when exchanging a proxy session
    ],
  }
);

export { User };
