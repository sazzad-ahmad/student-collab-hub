import { Router } from 'express';
import * as taskController from '../controllers/taskController.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createTaskValidator,
  updateTaskValidator,
  updateTaskStatusValidator,
  taskIdValidator,
  taskListValidator,
} from '../validators/taskValidator.js';

const router = Router();

router.use(requireAuth);

// Task creation - project_id in body
router.post('/', createTaskValidator, taskController.createTask);

// List tasks for a project - projectId in params
router.get('/project/:projectId', taskListValidator, taskController.getProjectTasks);

// Get single task by ID
router.get('/:taskId', taskIdValidator, taskController.getTaskById);

// Update task (full update)
router.put('/:taskId', updateTaskValidator, taskController.updateTask);

// Update task status only (for drag-and-drop)
router.patch('/:taskId/status', updateTaskStatusValidator, taskController.updateTaskStatus);

// Delete task
router.delete('/:taskId', taskIdValidator, taskController.deleteTask);

export default router;