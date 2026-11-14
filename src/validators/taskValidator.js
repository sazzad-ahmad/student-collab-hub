import { body, param, query } from 'express-validator';

export const createTaskValidator = [
  body('project_id').isInt({ min: 1 }).withMessage('Valid project ID required'),
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required (max 255 chars)'),
  body('description').optional().trim().isLength({ max: 10000 }).withMessage('Description max 10000 chars'),
  body('status').optional().isIn(['todo', 'in_progress', 'done']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
  body('due_date').optional().isISO8601().toDate().withMessage('Due date must be a valid ISO date'),
  body('assigned_to').optional().isInt({ min: 1 }).withMessage('Assigned user ID must be a positive integer'),
];

export const updateTaskValidator = [
  param('taskId').isInt({ min: 1 }).withMessage('Valid task ID required'),
  body('title').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Title max 255 chars'),
  body('description').optional().trim().isLength({ max: 10000 }).withMessage('Description max 10000 chars'),
  body('status').optional().isIn(['todo', 'in_progress', 'done']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
  body('due_date').optional().isISO8601().toDate().withMessage('Due date must be a valid ISO date'),
  body('assigned_to').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Assigned user ID must be a positive integer'),
];

export const updateTaskStatusValidator = [
  param('taskId').isInt({ min: 1 }).withMessage('Valid task ID required'),
  body('status').isIn(['todo', 'in_progress', 'done']).withMessage('Invalid status'),
];

export const taskIdValidator = [
  param('taskId').isInt({ min: 1 }).withMessage('Valid task ID required'),
];

export const taskListValidator = [
  param('projectId').isInt({ min: 1 }).withMessage('Valid project ID required'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['todo', 'in_progress', 'done']).withMessage('Invalid status filter'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority filter'),
];