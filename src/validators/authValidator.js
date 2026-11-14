import { body, param, query } from 'express-validator';

export const registerValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('fullName').trim().isLength({ min: 2, max: 150 }).withMessage('Full name is required'),
  body('role').optional().isIn(['student', 'team_lead']).withMessage('Invalid role'),
];

export const loginValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const projectIdValidator = [
  param('projectId').isInt({ min: 1 }).withMessage('Valid project ID required'),
];

export const taskIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Valid task ID required'),
];

export const commentIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Valid comment ID required'),
];

export const paginationValidator = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];