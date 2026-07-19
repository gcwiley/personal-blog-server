import { Attachment } from './attachment.model.js';
import { Post } from './post.model.js';
import { User } from './user.model.js';

// --- ASSOCIATIONS ---
// User-Post relationship
User.hasMany(Post, { foreignKey: 'authorId' });
Post.belongsTo(User, { foreignKey: 'authorId' });

// Post-Attachment relationship
Post.hasMany(Attachment, {
  foreignKey: 'postId',
  as: 'attachments',
  onDelete: 'CASCADE',
});
Attachment.belongsTo(Post, {
  foreignKey: 'postId',
  as: 'post',
});

// User-Attachment relationship (tracks who uploaded)
User.hasMany(Attachment, {
  foreignKey: 'uploadedBy',
  as: 'uploadedAttachments',
});
Attachment.belongsTo(User, {
  foreignKey: 'uploadedBy',
  as: 'uploadedAttachments',
});

export { Attachment, Post, User };
