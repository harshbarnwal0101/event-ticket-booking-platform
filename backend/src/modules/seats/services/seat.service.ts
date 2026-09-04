import { Types } from 'mongoose';
import Event from '../../events/models/Event';
import Seat, { SeatStatus } from '../models/Seat';

export class SeatService {
  async ensureSeatMap(eventId: string): Promise<void> {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const seatCount = await Seat.countDocuments({ eventId: new Types.ObjectId(eventId) });
    if (seatCount > 0) {
      return;
    }

    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const seats: any[] = [];

    rows.forEach((row) => {
      for (let number = 1; number <= 10; number += 1) {
        seats.push({
          eventId: new Types.ObjectId(eventId),
          row,
          number,
          seatLabel: `${row}${number}`,
          status: SeatStatus.AVAILABLE,
        });
      }
    });

    await Seat.insertMany(seats);
  }

  async listSeats(eventId: string): Promise<any[]> {
    await this.ensureSeatMap(eventId);

    return await Seat.find({ eventId: new Types.ObjectId(eventId) }).sort({ row: 1, number: 1 });
  }
}

export default new SeatService();
