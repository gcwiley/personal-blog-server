import { Router } from 'express';
const router = Router();

// post controller functions
import {
  newPost,
  getPosts,
  getPostById,
  updatePostById,
  deletePostById,
  getRecentlyCreatedPosts,
  getPostCount,
  searchPosts,
} from '../controllers/post.controller.js';

// attachment controller functions
import {
  getAttachmentsByPostId,
  addAttachment,
  deleteAttachment,
} from '../controllers/attachment.controller.js';

// import auth and upload middleware
import { authenticateToken } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

// multer error handler for attachment uploads
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(413)
        .json({
          success: false,
          message: 'File too large. Maximum size is 5MB.',
        });
    }
    if (err.code === 'INVALID_FILE_TYPE') {
      return res.status(415).json({ success: false, message: err.message });
    }
    return res
      .status(400)
      .json({
        success: false,
        message: 'File upload error.',
        error: err.message,
      });
  });
};

// GET /api/posts/count - count all posts
router.get('/count', getPostCount);

// GET /api/posts/recent - get recent posts
router.get('/recent', getRecentlyCreatedPosts);

// GET /api/posts/search - search posts
router.get('/search', searchPosts);

// GET /api/posts/:id - get post by ID
// (must come after specific routes like 'count' or 'recent')
router.get('/:id', getPostById);

// POST /api/posts - create new post
router.post('/', authenticateToken, newPost);

// GET /api/posts - get all posts
router.get('/', getPosts);

// PATCH /api/posts/:id - update post by ID
router.patch('/:id', authenticateToken, updatePostById);

// DELETE /api/posts/:id - delete post by ID
router.delete('/:id', authenticateToken, deletePostById);

// --- ATTACHMENT ROUTES ---

// GET /api/posts/:postId/attachments - get all attachments for a post
router.get('/:postId/attachments', getAttachmentsByPostId);

// POST /api/posts/:postId/attachments - upload attachment to a post
router.post(
  '/:postId/attachments',
  authenticateToken,
  handleUpload,
  addAttachment,
);

// DELETE /api/posts/:postId/attachments/:id - delete an attachment
router.delete('/:postId/attachments/:id', authenticateToken, deleteAttachment);

export { router as postRouter };
