import { Router } from 'express';
import * as projectController from '../controllers/projectController.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createProjectValidator,
  updateProjectValidator,
  projectIdValidator,
  projectListValidator,
  addMemberValidator,
  removeMemberValidator,
} from '../validators/projectValidator.js';

const router = Router();

router.use(requireAuth);

router.post('/', createProjectValidator, projectController.createProject);
router.get('/', projectListValidator, projectController.getAllProjects);
router.get('/:projectId', projectIdValidator, projectController.getProjectById);
router.put('/:projectId', updateProjectValidator, projectController.updateProject);
router.delete('/:projectId', projectIdValidator, projectController.deleteProject);

// Member management
router.post('/:projectId/members', addMemberValidator, projectController.addProjectMember);
router.delete('/:projectId/members/:userId', removeMemberValidator, projectController.removeProjectMember);

export default router;