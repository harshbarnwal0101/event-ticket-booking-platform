import { Request, Response } from 'express';
import seatService from '../services/seat.service';

export class SeatController {
  async listSeats(req: Request, res: Response): Promise<void> {
    try {
      const eventId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const seats = await seatService.listSeats(eventId);

      res.status(200).json({
        success: true,
        data: {
          seats: seats.map((seat) => ({
            _id: seat._id,
            seatLabel: seat.seatLabel,
            row: seat.row,
            number: seat.number,
            status: seat.status,
          })),
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch seats',
        errorCode: 'FETCH_SEATS_FAILED',
      });
    }
  }
}

export default new SeatController();
