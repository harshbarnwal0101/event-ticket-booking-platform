import { Types } from 'mongoose';
import Event from '../../events/models/Event';
import TicketType, { ITicketType } from '../models/TicketType';

interface CreateTicketTypePayload {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  salesStart?: Date;
  salesEnd?: Date;
}

export class TicketTypeService {
  async listForEvent(eventId: string): Promise<ITicketType[]> {
    return TicketType.find({
      eventId: new Types.ObjectId(eventId),
      isActive: true,
    }).sort({ price: 1 });
  }

  async create(
    eventId: string,
    organizerId: string,
    payload: CreateTicketTypePayload
  ): Promise<ITicketType> {
    const event = await Event.findOne({
      _id: eventId,
      organizerId: new Types.ObjectId(organizerId),
    });

    if (!event) {
      throw new Error('Event not found or unauthorized');
    }

    const ticketType = new TicketType({
      ...payload,
      eventId: new Types.ObjectId(eventId),
      availableQuantity: payload.quantity,
    });

    return ticketType.save();
  }
}

export default new TicketTypeService();
