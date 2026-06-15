import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validateRequest';
import { settingsController } from './settings.controller';
import { settingsValidation } from './settings.validation';

const router = Router();

router.use(auth);

router.get('/', settingsController.get);
router.put('/', validateRequest(settingsValidation.updateSchema), settingsController.update);

export const settingsRoutes = router;
