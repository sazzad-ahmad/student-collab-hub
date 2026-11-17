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
 * Create a new project with the authenticated user as owner
 */
export async function createProject(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const { name, description } = req.body;
    const ownerId = req.user.id;

    const result = await query(
      `INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)`,
      [name, description ?? null, ownerId]
    );

    const project = await queryOne(
      `SELECT p.*, u.full_name as owner_name, u.email as owner_email, u.avatar_url as owner_avatar
       FROM projects p
       JOIN users u ON p.owner_id = u.id
       WHERE p.id = ?`,
      [result.insertId]
    );

    // Add owner as a project member with 'lead' role
    await query(
      `INSERT INTO project_members (project_id, user_id, role_in_project) VALUES (?, ?, 'lead')`,
      [result.insertId, ownerId]
    );

    sendSuccess(res, { project }, 'Project created successfully', 201);
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * Get all projects with pagination and optional tag filtering
 * Note: The schema doesn't have a tags column, so tag filtering searches name/description
 */
export async function getAllProjects(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const safeLimit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 10));
    const tag = req.query.tag?.trim();
    const safeOffset = (page - 1) * safeLimit;

    let whereClause = '';
    const params = [];

    if (tag) {
      whereClause = 'WHERE p.name LIKE ? OR p.description LIKE ?';
      params.push(`%${tag}%`, `%${tag}%`);
    }

    // Get total count
    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM projects p ${whereClause}`,
      params
    );
    const total = countResult.total;

    // Get paginated projects with owner info
    const projects = await query(
      `SELECT p.*, u.full_name as owner_name, u.email as owner_email, u.avatar_url as owner_avatar
       FROM projects p
       JOIN users u ON p.owner_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    // Get member count for each project
    const projectIds = projects.map(p => p.id);
    let memberCounts = {};
    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => '?').join(',');
      const counts = await query(
        `SELECT project_id, COUNT(*) as member_count FROM project_members WHERE project_id IN (${placeholders}) GROUP BY project_id`,
        projectIds
      );
      counts.forEach(c => { memberCounts[c.project_id] = c.member_count; });
    }

    const projectsWithCounts = projects.map(p => ({
      ...p,
      member_count: memberCounts[p.id] || 0,
    }));

    sendSuccess(res, {
      projects: projectsWithCounts,
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
 * Get a single project by ID with members and owner info
 */
export async function getProjectById(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const { projectId } = req.params;

    const project = await queryOne(
      `SELECT p.*, u.full_name as owner_name, u.email as owner_email, u.avatar_url as owner_avatar
       FROM projects p
       JOIN users u ON p.owner_id = u.id
       WHERE p.id = ?`,
      [projectId]
    );

    if (!project) {
      return sendError(res, {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Project not found',
        statusCode: 404,
      });
    }

    // Get project members with user info
    const members = await query(
      `SELECT pm.user_id, pm.role_in_project, pm.joined_at,
              u.full_name, u.email, u.avatar_url, u.role as user_role
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = ?
       ORDER BY pm.role_in_project DESC, pm.joined_at ASC`,
      [projectId]
    );

    sendSuccess(res, { project: { ...project, members } });
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * Update a project (owner only)
 */
export async function updateProject(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const { projectId } = req.params;
    const { name, description } = req.body;
    const userId = req.user.id;

    // Check ownership
    const project = await queryOne(
      'SELECT owner_id FROM projects WHERE id = ?',
      [projectId]
    );

    if (!project) {
      return sendError(res, {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Project not found',
        statusCode: 404,
      });
    }

    if (project.owner_id !== userId) {
      return sendError(res, {
        code: ERROR_CODES.FORBIDDEN,
        message: 'Only the project owner can update this project',
        statusCode: 403,
      });
    }

    // Build dynamic update query
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (updates.length === 0) {
      return sendError(res, {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'No valid fields to update',
        statusCode: 400,
      });
    }

    params.push(projectId);
    await query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Return updated project
    const updatedProject = await queryOne(
      `SELECT p.*, u.full_name as owner_name, u.email as owner_email, u.avatar_url as owner_avatar
       FROM projects p
       JOIN users u ON p.owner_id = u.id
       WHERE p.id = ?`,
      [projectId]
    );

    sendSuccess(res, { project: updatedProject }, 'Project updated successfully');
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * Delete a project (owner only)
 */
export async function deleteProject(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Check ownership
    const project = await queryOne(
      'SELECT owner_id FROM projects WHERE id = ?',
      [projectId]
    );

    if (!project) {
      return sendError(res, {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Project not found',
        statusCode: 404,
      });
    }

    if (project.owner_id !== userId) {
      return sendError(res, {
        code: ERROR_CODES.FORBIDDEN,
        message: 'Only the project owner can delete this project',
        statusCode: 403,
      });
    }

    // Delete project (cascades to project_members and tasks via FK)
    await query('DELETE FROM projects WHERE id = ?', [projectId]);

    sendSuccess(res, null, 'Project deleted successfully', 204);
  } catch (err) {
    sendError(res, err);
  }
}

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
 * Add a member to a project - owner/lead can add by userId or email
 */
export async function addProjectMember(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const { projectId } = req.params;
    const { userId, email, role_in_project = 'member' } = req.body;
    const requesterId = req.user.id;

    // Verify requester is project owner or lead
    const isLeadOrOwner = await isProjectLeadOrOwner(projectId, requesterId);
    if (!isLeadOrOwner) {
      return sendError(res, {
        code: ERROR_CODES.FORBIDDEN,
        message: 'Only project owner or lead can add members',
        statusCode: 403,
      });
    }

    // Resolve userId from email if provided
    let targetUserId = userId;
    if (!targetUserId && email) {
      const user = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
      if (!user) {
        return sendError(res, {
          code: ERROR_CODES.NOT_FOUND,
          message: 'User not found with that email',
          statusCode: 404,
        });
      }
      targetUserId = user.id;
    }

    if (!targetUserId) {
      return sendError(res, {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Either userId or email is required',
        statusCode: 400,
      });
    }

    // Check if user is already a member
    const existingMember = await queryOne(
      `SELECT * FROM project_members WHERE project_id = ? AND user_id = ?`,
      [projectId, targetUserId]
    );

    if (existingMember) {
      return sendError(res, {
        code: ERROR_CODES.CONFLICT,
        message: 'User is already a member of this project',
        statusCode: 409,
      });
    }

    // Add member
    await query(
      `INSERT INTO project_members (project_id, user_id, role_in_project) VALUES (?, ?, ?)`,
      [projectId, targetUserId, role_in_project]
    );

    // Return the new member with user details
    const member = await queryOne(
      `SELECT pm.*, u.full_name, u.email, u.avatar_url, u.role as user_role
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = ? AND pm.user_id = ?`,
      [projectId, targetUserId]
    );

    sendSuccess(res, { member }, 'Member added successfully', 201);
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * Remove a member from a project - owner/lead can remove, or member can leave
 */
export async function removeProjectMember(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const { projectId, userId: targetUserId } = req.params;
    const requesterId = req.user.id;
    const targetUserIdNum = parseInt(targetUserId, 10);

    // Check if requester is project owner/lead
    const isLeadOrOwner = await isProjectLeadOrOwner(projectId, requesterId);

    // Check if requester is the member themselves (leaving)
    const isSelf = requesterId === targetUserIdNum;

    if (!isLeadOrOwner && !isSelf) {
      return sendError(res, {
        code: ERROR_CODES.FORBIDDEN,
        message: 'Only project owner/lead can remove other members, or you can leave yourself',
        statusCode: 403,
      });
    }

    // Cannot remove project owner
    const project = await queryOne('SELECT owner_id FROM projects WHERE id = ?', [projectId]);
    if (project && project.owner_id === targetUserIdNum) {
      return sendError(res, {
        code: ERROR_CODES.FORBIDDEN,
        message: 'Cannot remove the project owner',
        statusCode: 403,
      });
    }

    // Check if member exists
    const member = await queryOne(
      `SELECT * FROM project_members WHERE project_id = ? AND user_id = ?`,
      [projectId, targetUserIdNum]
    );

    if (!member) {
      return sendError(res, {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Member not found in this project',
        statusCode: 404,
      });
    }

    await query('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, targetUserIdNum]);

    sendSuccess(res, null, isSelf ? 'You have left the project' : 'Member removed successfully', 204);
  } catch (err) {
    sendError(res, err);
  }
}