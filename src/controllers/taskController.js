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
 * Check if user is a member of a project (including owner/lead)
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

  // Also check if user is the project owner
  const project = await queryOne('SELECT owner_id FROM projects WHERE id = ?', [projectId]);
  return project?.owner_id === userId;
};

/**
 * Create a task - verify requester is a project member
 */
export async function createTask(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const { project_id, title, description, status, priority, due_date, assigned_to } = req.body;
    const reporterId = req.user.id;

    // Verify user is a project member
    const membership = await isProjectMember(project_id, reporterId);
    if (!membership) {
      return sendError(res, {
        code: ERROR_CODES.FORBIDDEN,
        message: 'You must be a project member to create tasks',
        statusCode: 403,
      });
    }

    // If assigned_to is provided, verify that user is also a project member
    if (assigned_to) {
      const assigneeMembership = await isProjectMember(project_id, assigned_to);
      if (!assigneeMembership) {
        return sendError(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Assigned user must be a project member',
          statusCode: 400,
        });
      }
    }

    const result = await query(
      `INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, reporter_id, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project_id,
        title,
        description ?? null,
        status ?? 'todo',
        priority ?? 'medium',
        assigned_to ?? null,
        reporterId,
        due_date ?? null,
      ]
    );

    const task = await queryOne(
      `SELECT t.*, 
              u1.full_name as assignee_name, u1.email as assignee_email, u1.avatar_url as assignee_avatar,
              u2.full_name as reporter_name, u2.email as reporter_email, u2.avatar_url as reporter_avatar,
              p.name as project_name
       FROM tasks t
       LEFT JOIN users u1 ON t.assignee_id = u1.id
       LEFT JOIN users u2 ON t.reporter_id = u2.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.id = ?`,
      [result.insertId]
    );

    sendSuccess(res, { task }, 'Task created successfully', 201);
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * Get all tasks for a project with optional status/priority filters
 */
export async function getProjectTasks(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const { projectId } = req.params;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const safeLimit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 20));
    const status = req.query.status;
    const priority = req.query.priority;
    const safeOffset = (page - 1) * safeLimit;

    // Verify user is a project member
    const membership = await isProjectMember(projectId, req.user.id);
    if (!membership) {
      return sendError(res, {
        code: ERROR_CODES.FORBIDDEN,
        message: 'You must be a project member to view tasks',
        statusCode: 403,
      });
    }

    let whereClause = 'WHERE t.project_id = ?';
    const params = [projectId];

    if (status) {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }
    if (priority) {
      whereClause += ' AND t.priority = ?';
      params.push(priority);
    }

    // Get total count
    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM tasks t ${whereClause}`,
      params
    );
    const total = countResult.total;

    // Get paginated tasks with assignee and reporter info
    const tasks = await query(
      `SELECT t.*, 
              u1.full_name as assignee_name, u1.email as assignee_email, u1.avatar_url as assignee_avatar,
              u2.full_name as reporter_name, u2.email as reporter_email, u2.avatar_url as reporter_avatar
       FROM tasks t
       LEFT JOIN users u1 ON t.assignee_id = u1.id
       LEFT JOIN users u2 ON t.reporter_id = u2.id
       ${whereClause}
       ORDER BY 
         CASE t.priority 
           WHEN 'critical' THEN 4 
           WHEN 'high' THEN 3 
           WHEN 'medium' THEN 2 
           WHEN 'low' THEN 1 
         END DESC,
         t.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    sendSuccess(res, {
      tasks,
      pagination: {
        page,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * Get a single task by ID with assignee, reporter, and project info
 */
export async function getTaskById(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const { taskId } = req.params;

    const task = await queryOne(
      `SELECT t.*, 
              u1.full_name as assignee_name, u1.email as assignee_email, u1.avatar_url as assignee_avatar,
              u2.full_name as reporter_name, u2.email as reporter_email, u2.avatar_url as reporter_avatar,
              p.name as project_name, p.owner_id as project_owner_id
       FROM tasks t
       LEFT JOIN users u1 ON t.assignee_id = u1.id
       LEFT JOIN users u2 ON t.reporter_id = u2.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.id = ?`,
      [taskId]
    );

    if (!task) {
      return sendError(res, {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Task not found',
        statusCode: 404,
      });
    }

    // Verify user is a project member
    const membership = await isProjectMember(task.project_id, req.user.id);
    if (!membership) {
      return sendError(res, {
        code: ERROR_CODES.FORBIDDEN,
        message: 'You must be a project member to view this task',
        statusCode: 403,
      });
    }

    sendSuccess(res, { task });
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * Update a task - allow assignee, creator (reporter), or project lead/owner
 */
export async function updateTask(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const { taskId } = req.params;
    const { title, description, status, priority, due_date, assigned_to } = req.body;
    const userId = req.user.id;

    const task = await queryOne(
      `SELECT t.*, p.owner_id as project_owner_id
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = ?`,
      [taskId]
    );

    if (!task) {
      return sendError(res, {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Task not found',
        statusCode: 404,
      });
    }

    // Check permissions: assignee, reporter, or project lead/owner
    const isAssignee = task.assignee_id === userId;
    const isReporter = task.reporter_id === userId;
    const isLeadOrOwner = await isProjectLeadOrOwner(task.project_id, userId);

    if (!isAssignee && !isReporter && !isLeadOrOwner) {
      return sendError(res, {
        code: ERROR_CODES.FORBIDDEN,
        message: 'Only the assignee, reporter, or project lead/owner can update this task',
        statusCode: 403,
      });
    }

    // If assigned_to is being changed, verify the new assignee is a project member
    if (assigned_to !== undefined && assigned_to !== null && assigned_to !== task.assignee_id) {
      const assigneeMembership = await isProjectMember(task.project_id, assigned_to);
      if (!assigneeMembership) {
        return sendError(res, {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Assigned user must be a project member',
          statusCode: 400,
        });
      }
    }

    // Build dynamic update query
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
    }
    if (due_date !== undefined) {
      updates.push('due_date = ?');
      params.push(due_date);
    }
    if (assigned_to !== undefined) {
      updates.push('assignee_id = ?');
      params.push(assigned_to);
    }

    if (updates.length === 0) {
      return sendError(res, {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'No valid fields to update',
        statusCode: 400,
      });
    }

    params.push(taskId);
    await query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Return updated task
    const updatedTask = await queryOne(
      `SELECT t.*, 
              u1.full_name as assignee_name, u1.email as assignee_email, u1.avatar_url as assignee_avatar,
              u2.full_name as reporter_name, u2.email as reporter_email, u2.avatar_url as reporter_avatar,
              p.name as project_name
       FROM tasks t
       LEFT JOIN users u1 ON t.assignee_id = u1.id
       LEFT JOIN users u2 ON t.reporter_id = u2.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.id = ?`,
      [taskId]
    );

    sendSuccess(res, { task: updatedTask }, 'Task updated successfully');
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * Update only task status - simplified endpoint for drag-and-drop
 */
export async function updateTaskStatus(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const { taskId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const task = await queryOne(
      `SELECT t.*, p.owner_id as project_owner_id
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = ?`,
      [taskId]
    );

    if (!task) {
      return sendError(res, {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Task not found',
        statusCode: 404,
      });
    }

    // Check permissions
    const isAssignee = task.assignee_id === userId;
    const isReporter = task.reporter_id === userId;
    const isLeadOrOwner = await isProjectLeadOrOwner(task.project_id, userId);

    if (!isAssignee && !isReporter && !isLeadOrOwner) {
      return sendError(res, {
        code: ERROR_CODES.FORBIDDEN,
        message: 'Only the assignee, reporter, or project lead/owner can update this task',
        statusCode: 403,
      });
    }

    await query('UPDATE tasks SET status = ? WHERE id = ?', [status, taskId]);

    const updatedTask = await queryOne(
      `SELECT t.*, 
              u1.full_name as assignee_name, u1.email as assignee_email, u1.avatar_url as assignee_avatar,
              u2.full_name as reporter_name, u2.email as reporter_email, u2.avatar_url as reporter_avatar
       FROM tasks t
       LEFT JOIN users u1 ON t.assignee_id = u1.id
       LEFT JOIN users u2 ON t.reporter_id = u2.id
       WHERE t.id = ?`,
      [taskId]
    );

    sendSuccess(res, { task: updatedTask }, 'Task status updated successfully');
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * Delete a task - allow only project owner/lead or task creator (reporter)
 */
export async function deleteTask(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    const task = await queryOne(
      `SELECT t.*, p.owner_id as project_owner_id
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.id = ?`,
      [taskId]
    );

    if (!task) {
      return sendError(res, {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Task not found',
        statusCode: 404,
      });
    }

    // Check permissions: task reporter (creator) or project lead/owner
    const isReporter = task.reporter_id === userId;
    const isLeadOrOwner = await isProjectLeadOrOwner(task.project_id, userId);

    if (!isReporter && !isLeadOrOwner) {
      return sendError(res, {
        code: ERROR_CODES.FORBIDDEN,
        message: 'Only the task creator or project lead/owner can delete this task',
        statusCode: 403,
      });
    }

    await query('DELETE FROM tasks WHERE id = ?', [taskId]);

    sendSuccess(res, null, 'Task deleted successfully', 204);
  } catch (err) {
    sendError(res, err);
  }
}