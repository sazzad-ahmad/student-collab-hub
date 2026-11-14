import { body, param, query } from 'express-validator';

export const createProjectValidator = [
  body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Project name is required (max 200 chars)'),
  body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description max 5000 chars'),
];

export const updateProjectValidator = [
  param('projectId').isInt({ min: 1 }).withMessage('Valid project ID required'),
  body('name').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Project name max 200 chars'),
  body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description max 5000 chars'),
];

export const projectIdValidator = [
  param('projectId').isInt({ min: 1 }).withMessage('Valid project ID required'),
];

export const projectListValidator = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('tag').optional().trim().isLength({ max: 50 }).withMessage('Tag max 50 chars'),
];

export const addMemberValidator = [
  param('projectId').isInt({ min: 1 }).withMessage('Valid project ID required'),
  body('userId').optional().isInt({ min: 1 }).withMessage('Valid user ID required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('role_in_project').optional().isIn(['member', 'lead']).withMessage('Invalid role'),
];

export const removeMemberValidator = [
  param('projectId').isInt({ min: 1 }).withMessage('Valid project ID required'),
  param('userId').isInt({ min: 1 }).withMessage('Valid user ID required'),
];