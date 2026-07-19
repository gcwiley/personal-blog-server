import { DataTypes } from 'sequelize';
import { sequelize } from '../db/connect_to_sqldb.js';

// define the post model with the specified fields and constraints
const Post = sequelize.define(
   'Post',
   {
      // id - unique identifier (UUID) 
      id: {
         type: DataTypes.UUID,
         defaultValue: DataTypes.UUIDV4,
         primaryKey: true,
      },
      // title of the post (should not be null)
      title: {
         type: DataTypes.STRING,
         allowNull: false,
      },
      // body content of the post
      body: {
         type: DataTypes.TEXT,
         allowNull: false,
      },
      // category to classify the post (e.g., technology, lifestyle, etc.)
      category: {
         type: DataTypes.STRING,
         allowNull: false,
         validate: { notEmpty: true },
      },
      // favorite flag to mark a post as a favorite
      isFavorite: {
         type: DataTypes.BOOLEAN,
         defaultValue: false, 
      },
      // date of post publication
      publishedDate: {
         type: DataTypes.DATE,
         allowNull: false, // ensures the date is not null
         defaultValue: DataTypes.NOW, // set the default date to now
         validate: {
            isDate: true, // ensures a valid date is given
         },
      },
   },
   {
      // enable timestamps for createdAt and updatedAt fields
      timestamps: true,
      // define indexes for efficient querying
      indexes: [
         {
            fields: ['authorId', 'category'], // adds a composite index on the 'author' column
         },
         {
            fields: ['publishedDate'], // index on date for efficient querying by date
         },
         {
            fields: ['isFavorite'],
         },
      ],
   }
);

export { Post };
