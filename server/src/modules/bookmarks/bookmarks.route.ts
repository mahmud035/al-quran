import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validateRequest';
import { bookmarksController } from './bookmarks.controller';
import { bookmarksValidation } from './bookmarks.validation';

const router = Router();

// Every bookmark route requires authentication.
router.use(auth);

// IMPORTANT: /check must be registered BEFORE /:id, otherwise Express would
// try to treat the literal "check" as an :id ObjectId.
router.get('/check', validateRequest(bookmarksValidation.checkSchema), bookmarksController.check);

router.get('/', bookmarksController.list);
router.post('/', validateRequest(bookmarksValidation.createSchema), bookmarksController.create);
router.delete('/:id', validateRequest(bookmarksValidation.idParamSchema), bookmarksController.remove);

export const bookmarksRoutes = router;
