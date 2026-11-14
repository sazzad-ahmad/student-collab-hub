import { validationResult } from 'express-validator';
import { query, queryOne } from '../../config/database.js';
import { sendSuccess, sendError, ERROR_CODES } from '../utils/responses.js';

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Validation failed',
      details: errors.array(),
      statusCode: 400,
    });
    return false;
  }
  return true;
}

/**
 * Check if user is a member of a project
 */
const isProjectMember = async (projectId, userId) => {
  const member = await queryOne(
    `SELECT role_in_project FROM project_members WHERE project_id = ? AND user_id = ?`,
    [projectId, userId]
  );
  return member;
};

/**
 * Check if user is project owner or lead
 */
const isProjectLeadOrOwner = async (projectId, userId) => {
  const member = await queryOne(
    `SELECT role_in_project FROM project_members WHERE project_id = ? AND user_id = ? AND role_in_project = 'lead'`,
    [projectId, userId]
  );
  if (member) return true;

  const project = await queryOne('SELECT owner_id FROM projects WHERE id = ?', [projectId]);
  return project?.owner_id === userId;
};

/**
 * Get project ID from task ID
 */
const getProjectIdFromTask = async (taskId) => {
  const task = await queryOne('SELECT project_id FROM tasks WHERE id = ?', [taskId]);
  return task?.project_id;
};

/**
 * Create a comment on a task - verify requester is a project member
 */
export async function createComment(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const { task_id, content } = req.body;
    const userId = req.user.id;

    // Get project ID from task
    const projectId = await getProjectIdFromTask(task_id);
    if (!projectId) {
      return sendError(res, {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Task not found',
        statusCode: 404,
      });
    }

    // Verify user is a project member
    const membership = await isProjectMember(projectId, userId);
    if (!membership) {
      return sendError(res, {
        code: ERROR_CODES.FORBIDDEN,
        message: 'You must be a project member to comment on tasks',
        statusCode: 403,
      });
    }

    const result = await query(
      `INSERT INTO task_comments (task_id, user_id, content) VALUES (?, ?, ?)`,
      [task_id, userId, content]
    );

    const comment = await queryOne(
      `SELECT tc.*, u.full_name as author_name, u.email as author_email, u.avatar_url as author_avatar
       FROM task_comments tc
       JOIN users u ON tc.user_id = u.id
       WHERE tc.id = ?`,
      [result.insertId]
    );

    sendSuccess(res, { comment }, 'Comment added successfully', 201);
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * Get all comments for a task with author details
 */
export async function getTaskComments(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const { taskId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Get project ID from task to verify membership
    const projectId = await getProjectIdFromTask(taskId);
    if (!projectId) {
      return sendError(res, {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Task not found',
        statusCode: 404,
      });
    }

    // Verify user is a project member
    const membership = await isProjectMember(projectId, req.user.id);
    if (!membership) {
      return sendError(res, {
        code: ERROR_CODES.FORBIDDEN,
        message: 'You must be a project member to view comments',
        statusCode: 403,
      });
    }

    // Get total count
    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM task_comments WHERE task_id = ?`,
      [taskId]
    );
    const total = countResult.total;

    // Get paginated comments with author info (oldest first for chronological order)
    const comments = await query(
      `SELECT tc.*, u.full_name as author_name, u.email as author_email, u.avatar_url as author_avatar
       FROM task_comments tc
       JOIN users u ON tc.user_id = u.id
       WHERE tc.task_id = ?
       ORDER BY tc.created_at ASC
       LIMIT ? OFFSET ?`,
      [taskId, limit, offset]
    );

    sendSuccess(res, {
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * Update a comment - only comment author can edit
 */
export async function updateComment(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const comment = await queryOne(
      `SELECT tc.*, t.project_id
       FROM task_comments tc
       JOIN tasks t ON tc.task_id = t.id
       WHERE tc.id = ?`,
      [commentId]
    );

    if (!comment) {
      return sendError(res, {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Comment not found',
        statusCode: 404,
      });
    }

    // Only comment author can edit
    if (comment.user_id !== userId) {
      return sendError(res, {
        code: ERROR_CODES.FORBIDDEN,
        message: 'You can only edit your own comments',
        statusCode: 403,
      });
    }

    await query('UPDATE task_comments SET content = ? WHERE id = ?', [content, commentId]);

    const updatedComment = await queryOne(
      `SELECT tc.*, u.full_name as author_name, u.email as author_email, u.avatar_url as author_avatar
       FROM task_comments tc
       JOIN users u ON tc.user_id = u.id
       WHERE tc.id = ?`,
      [commentId]
    );

    sendSuccess(res, { comment: updatedComment }, 'Comment updated successfully');
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * Delete a comment - comment author or project owner/lead can delete
 */
export async function deleteComment(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await queryOne(
      `SELECT tc.*, t.project_id
       FROM task_comments tc
       JOIN tasks t ON tc.task_id = t.id
       WHERE tc.id = ?`,
      [commentId]
    );

    if (!comment) {
      return sendError(res, {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Comment not found',
        statusCode: 404,
      });
    }

    // Check permissions: comment author or project owner/lead
    const isAuthor = comment.user_id === userId;
    const isLeadOrOwner = await isProjectLeadOrOwner(comment.project_id, userId);

    if (!isAuthor && !isLeadOrOwner) {
      return sendError(res, {
        code: ERROR_CODES.FORBIDDEN,
        message: 'Only the comment author or project owner/lead can delete this comment',
        statusCode: 403,
      });
    }

    await query('DELETE FROM task_comments WHERE id = ?', [commentId]);

    sendSuccess(res, null, 'Comment deleted successfully', 204);
  } catch (err) {
    sendError(res, err);
  }
}