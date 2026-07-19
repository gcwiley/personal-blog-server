import fs from 'fs';
import path from 'path';
import { Attachment } from '../models/index.js';
import { isValidUUID } from '../helpers/validate.js';
import { UPLOAD_DIR } from '../middleware/upload.middleware.js';

// GET - fetch all attachments for a post
export const getAttachmentsByPostId = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!isValidUUID(postId)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid post ID format.' });
    }

    const attachments = await Attachment.findAll({
      where: { postId },
      order: [['createdAt', 'ASC']],
    });

    res.status(200).json({
      success: true,
      message: attachments.length
        ? 'Successfully fetched attachments.'
        : 'No attachments found.',
      data: attachments,
    });
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attachments.',
      error: error.message,
    });
  }
};

// POST - upload a new attachment to a post
export const addAttachment = async (req, res) => {
  try {
    // validate postId format
    const { postId } = req.params;

    // validate postId format 
    if (!isValidUUID(postId)) {
      if (req.file) {
        fs.unlinkSync(path.join(UPLOAD_DIR, req.file.filename));
      }
      return res
        .status(400)
        .json({ success: false, message: 'Invalid post ID format.' });
    }

    // ensure a file was uploaded
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: 'No file uploaded.' });
    }

    const description = req.body.description ?? '';

    // create a new attachment record in the database
    const attachment = await Attachment.create({
      postId,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      filePath: `/uploads/${req.file.filename}`,
      mimeType: req.file.mimetype, // store MIME type for validation
      fileSize: req.file.size, 
      description,
      uploadedBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Attachment uploaded successfully.',
      data: attachment,
    });
  } catch (error) {
    // clean up uploaded file on DB error
    if (req.file) {
      try {
        // remove the uploaded file if there was an error saving to the database
        fs.unlinkSync(path.join(UPLOAD_DIR, req.file.filename));
      } catch (unlinkError) {
        // log the error but don't crash the server
        console.error('Failed to remove orphaned file:', unlinkError);
      }
    }
    console.error('Error uploading attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading attachment.',
      error: error.message,
    });
  }
};

// DELETE - remove an attachment by ID
export const deleteAttachment = async (req, res) => {
  try {
    const { postId, id } = req.params;

    // validate postId and attachment id format
    if (!isValidUUID(postId) || !isValidUUID(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid ID format.' });
    }

    // find the attachment in the database
    const attachment = await Attachment.findOne({ where: { id, postId } });
    if (!attachment) {
      return res
        .status(404)
        .json({ success: false, message: 'Attachment not found.' });
    }

    // delete file from disk 
    const filePath = path.join(UPLOAD_DIR, attachment.storedName);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      console.error('Error deleting file from disk:', fileError);
    }

    // delete attachment record from database
    await attachment.destroy();

    res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully.',
      data: attachment,
    });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting attachment.',
      error: error.message,
    });
  }
};
