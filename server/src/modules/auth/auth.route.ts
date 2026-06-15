import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validateRequest';
import { authController } from './auth.controller';
import { authValidation } from './auth.validation';

const router = Router();

router.post('/register', validateRequest(authValidation.registerSchema), authController.register);
router.post('/login', validateRequest(authValidation.loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', auth, authController.me);

export const authRoutes = router;
