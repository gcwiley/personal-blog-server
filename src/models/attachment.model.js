import { DataTypes } from 'sequelize';
import { sequelize } from '../db/connect_to_sqldb.js';

const Attachment = sequelize.define(
  'Attachment',
  {
    // id - unique identifier
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // postId - foreign key to Post Model
    postId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Posts',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    // original filename
    originalName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // stored filename (unique)
    storedName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    // file path in storage
    filePath: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // mime type
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // file size in bytes
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    // optional description of the attachment
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // uploaded by user id
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
  },
  {
    timestamps: true,
    // define indexes for efficient querying
    indexes: [
      {
        fields: ['postId'],
      },
      {
        fields: ['uploadedBy'],
      },
    ],
  },
);

export { Attachment };
