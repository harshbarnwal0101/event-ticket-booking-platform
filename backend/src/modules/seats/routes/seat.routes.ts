import { Router } from 'express';
import seatController from '../controllers/seat.controller';

const router = Router();

router.get('/:id/seats', (req, res) => seatController.listSeats(req, res));

export default router;
