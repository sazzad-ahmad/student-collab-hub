import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { registerValidator, loginValidator } from '../validators/authValidator.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', registerValidator, authController.register);
router.post('/login', loginValidator, authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;