import Event, { IEvent, EventStatus } from '../models/Event';
import Venue from '../models/Venue';
import { Types } from 'mongoose';

interface CreateEventPayload {
  title: string;
  description: string;
  organizerId: string;
  venueId: string;
  category: string;
  startDateTime: Date;
  endDateTime: Date;
  totalCapacity: number;
  basePrice: number;
  bannerUrl?: string;
  tags?: string[];
}

interface UpdateEventPayload {
  title?: string;
  description?: string;
  category?: string;
  startDateTime?: Date;
  endDateTime?: Date;
  status?: EventStatus;
  basePrice?: number;
  bannerUrl?: string;
  tags?: string[];
}

interface SearchEventsOptions {
  search?: string;
  category?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
  sortBy: 'date' | 'price' | 'popularity';
}

export class EventService {
  async createEvent(payload: CreateEventPayload): Promise<IEvent> {
    // Verify venue exists
    const venue = await Venue.findById(payload.venueId);
    if (!venue) {
      throw new Error('Venue not found');
    }

    const event = new Event({
      ...payload,
      organizerId: new Types.ObjectId(payload.organizerId),
      venueId: new Types.ObjectId(payload.venueId),
      ticketsAvailable: payload.totalCapacity,
      status: EventStatus.DRAFT,
    });

    return await event.save();
  }

  async getEventById(eventId: string): Promise<IEvent | null> {
    return await Event.findById(eventId)
      .populate('organizerId', 'email firstName lastName')
      .populate('venueId', 'name city state country address');
  }

  async updateEvent(
    eventId: string,
    organizerId: string,
    payload: UpdateEventPayload
  ): Promise<IEvent> {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Verify organizer ownership
    if (event.organizerId.toString() !== organizerId) {
      throw new Error('Unauthorized to update this event');
    }

    // Cannot update published/completed events
    if ([EventStatus.PUBLISHED, EventStatus.COMPLETED].includes(event.status)) {
      throw new Error('Cannot update published or completed events');
    }

    Object.assign(event, payload);
    return await event.save();
  }

  async publishEvent(eventId: string, organizerId: string): Promise<IEvent> {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.organizerId.toString() !== organizerId) {
      throw new Error('Unauthorized to publish this event');
    }

    if (event.status !== EventStatus.DRAFT) {
      throw new Error('Only draft events can be published');
    }

    event.status = EventStatus.PUBLISHED;
    return await event.save();
  }

  async cancelEvent(eventId: string, organizerId: string): Promise<IEvent> {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.organizerId.toString() !== organizerId) {
      throw new Error('Unauthorized to cancel this event');
    }

    if ([EventStatus.COMPLETED, EventStatus.CANCELLED].includes(event.status)) {
      throw new Error('Cannot cancel completed or already cancelled events');
    }

    event.status = EventStatus.CANCELLED;
    return await event.save();
  }

  async searchEvents(options: SearchEventsOptions): Promise<{ events: IEvent[]; total: number }> {
    const skip = (options.page - 1) * options.limit;

    // Build query filters
    const filters: any = { isActive: true, status: EventStatus.PUBLISHED };

    if (options.search) {
      filters.$text = { $search: options.search };
    }

    if (options.category) {
      filters.category = options.category;
    }

    if (options.minPrice !== undefined) {
      filters.basePrice = { ...filters.basePrice, $gte: options.minPrice };
    }

    if (options.maxPrice !== undefined) {
      filters.basePrice = { ...filters.basePrice, $lte: options.maxPrice };
    }

    if (options.startDate) {
      filters.startDateTime = { ...filters.startDateTime, $gte: options.startDate };
    }

    if (options.endDate) {
      filters.endDateTime = { ...filters.endDateTime, $lte: options.endDate };
    }

    // Build sort
    let sort: any = {};
    switch (options.sortBy) {
      case 'price':
        sort.basePrice = 1;
        break;
      case 'popularity':
        sort.ticketsSold = -1;
        break;
      case 'date':
      default:
        sort.startDateTime = 1;
        break;
    }

    const [events, total] = await Promise.all([
      Event.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(options.limit)
        .populate('organizerId', 'email firstName lastName')
        .populate('venueId', 'name city state country address')
        .lean() as any,
      Event.countDocuments(filters),
    ]);

    return { events: events as unknown as IEvent[], total };
  }

  async getOrganizerEvents(organizerId: string, page: number = 1, limit: number = 10): Promise<{ events: IEvent[]; total: number }> {
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      Event.find({ organizerId: new Types.ObjectId(organizerId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('venueId', 'name city state country address')
        .lean() as any,
      Event.countDocuments({ organizerId: new Types.ObjectId(organizerId) }),
    ]);

    return { events: events as unknown as IEvent[], total };
  }

  async updateTicketCount(eventId: string, decrease: number): Promise<void> {
    await Event.findByIdAndUpdate(
      eventId,
      {
        $inc: {
          ticketsAvailable: -decrease,
          ticketsSold: decrease,
        },
      },
      { new: true }
    );
  }
}

export default new EventService();
