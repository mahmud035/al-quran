import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validateRequest';
import { progressController } from './progress.controller';
import { progressValidation } from './progress.validation';

const router = Router();

// Progress requires an account: guests record nothing (design D10).
router.use(auth);

router.get('/', validateRequest(progressValidation.getProgressSchema), progressController.get);
router.post(
  '/ayahs',
  validateRequest(progressValidation.recordAyahsSchema),
  progressController.recordAyahs,
);
router.put(
  '/last-read',
  validateRequest(progressValidation.lastReadSchema),
  progressController.setLastRead,
);

export const progressRoutes = router;
