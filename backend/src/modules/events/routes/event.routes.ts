import { Router } from 'express';
import eventController from '../controllers/event.controller';
import { authenticateToken, isOrganizer } from '../../auth/middleware/auth.middleware';

const router = Router();

// Protected routes - Organizers only (must come before /:id route)
router.post('/', authenticateToken, isOrganizer, (req, res) =>
  eventController.createEvent(req, res)
);

router.get('/organizer/my-events', authenticateToken, isOrganizer, (req, res) =>
  eventController.getOrganizerEvents(req, res)
);

router.put('/:id', authenticateToken, isOrganizer, (req, res) =>
  eventController.updateEvent(req, res)
);

router.post('/:id/publish', authenticateToken, isOrganizer, (req, res) =>
  eventController.publishEvent(req, res)
);

router.post('/:id/cancel', authenticateToken, isOrganizer, (req, res) =>
  eventController.cancelEvent(req, res)
);

// Public routes
router.get('/search', (req, res) => eventController.searchEvents(req, res));
router.get('/:id', (req, res) => eventController.getEvent(req, res));

export default router;
