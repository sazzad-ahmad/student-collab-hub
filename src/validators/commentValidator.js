import { body, param, query } from 'express-validator';

export const createCommentValidator = [
  body('task_id').isInt({ min: 1 }).withMessage('Valid task ID required'),
  body('content').trim().isLength({ min: 1, max: 10000 }).withMessage('Comment content is required (max 10000 chars)'),
];

export const updateCommentValidator = [
  param('commentId').isInt({ min: 1 }).withMessage('Valid comment ID required'),
  body('content').trim().isLength({ min: 1, max: 10000 }).withMessage('Comment content is required (max 10000 chars)'),
];

export const commentIdValidator = [
  param('commentId').isInt({ min: 1 }).withMessage('Valid comment ID required'),
];

export const taskCommentsValidator = [
  param('taskId').isInt({ min: 1 }).withMessage('Valid task ID required'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];