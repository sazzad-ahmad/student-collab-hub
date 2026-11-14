import { Router } from 'express';
import * as commentController from '../controllers/commentController.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createCommentValidator,
  updateCommentValidator,
  commentIdValidator,
  taskCommentsValidator,
} from '../validators/commentValidator.js';

const router = Router();

router.use(requireAuth);

// Comments for a specific task
router.get('/task/:taskId', taskCommentsValidator, commentController.getTaskComments);
router.post('/', createCommentValidator, commentController.createComment);
router.put('/:commentId', updateCommentValidator, commentController.updateComment);
router.delete('/:commentId', commentIdValidator, commentController.deleteComment);

export default router;