import { Router } from 'express';
import venueController from '../controllers/venue.controller';
import { authenticateToken } from '../../auth/middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/search', (req, res) => venueController.searchVenues(req, res));
router.get('/:id', (req, res) => venueController.getVenue(req, res));

// Protected routes
router.post('/', authenticateToken, (req, res) => venueController.createVenue(req, res));

export default router;
