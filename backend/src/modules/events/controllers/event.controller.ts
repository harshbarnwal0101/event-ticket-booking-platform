import { Request, Response } from 'express';
import eventService from '../services/event.service';

export class EventController {
  async createEvent(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
          errorCode: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { title, description, venueId, category, startDateTime, endDateTime, totalCapacity, basePrice, bannerUrl, tags } = req.body;

      const event = await eventService.createEvent({
        title,
        description,
        organizerId: req.user.userId,
        venueId,
        category,
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime),
        totalCapacity,
        basePrice,
        bannerUrl,
        tags,
      });

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: { event },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create event',
        errorCode: 'CREATE_EVENT_FAILED',
      });
    }
  }

  async getEvent(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const event = await eventService.getEventById(id);
      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Event not found',
          errorCode: 'EVENT_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { event },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch event',
        errorCode: 'FETCH_EVENT_FAILED',
      });
    }
  }

  async updateEvent(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
          errorCode: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const payload = req.body;

      const event = await eventService.updateEvent(id, req.user.userId, payload);

      res.status(200).json({
        success: true,
        message: 'Event updated successfully',
        data: { event },
      });
    } catch (error: any) {
      const statusCode = error.message === 'Unauthorized to update this event' ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update event',
        errorCode: 'UPDATE_EVENT_FAILED',
      });
    }
  }

  async publishEvent(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
          errorCode: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const event = await eventService.publishEvent(id, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Event published successfully',
        data: { event },
      });
    } catch (error: any) {
      const statusCode = error.message === 'Unauthorized to publish this event' ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to publish event',
        errorCode: 'PUBLISH_EVENT_FAILED',
      });
    }
  }

  async cancelEvent(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
          errorCode: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const event = await eventService.cancelEvent(id, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Event cancelled successfully',
        data: { event },
      });
    } catch (error: any) {
      const statusCode = error.message === 'Unauthorized to cancel this event' ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to cancel event',
        errorCode: 'CANCEL_EVENT_FAILED',
      });
    }
  }

  async searchEvents(req: Request, res: Response): Promise<void> {
    try {
      const { search, category, city, minPrice, maxPrice, startDate, endDate, page = 1, limit = 10, sortBy = 'date' } = req.query;

      const options = {
        search: search as string | undefined,
        category: category as string | undefined,
        city: city as string | undefined,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: parseInt(page as string) || 1,
        limit: Math.min(parseInt(limit as string) || 10, 100),
        sortBy: (sortBy as 'date' | 'price' | 'popularity') || 'date',
      };

      const result = await eventService.searchEvents(options);

      res.status(200).json({
        success: true,
        data: {
          events: result.events,
          pagination: {
            total: result.total,
            page: options.page,
            limit: options.limit,
            pages: Math.ceil(result.total / options.limit),
          },
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to search events',
        errorCode: 'SEARCH_EVENTS_FAILED',
      });
    }
  }

  async getOrganizerEvents(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
          errorCode: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await eventService.getOrganizerEvents(req.user.userId, page, limit);

      res.status(200).json({
        success: true,
        data: {
          events: result.events,
          pagination: {
            total: result.total,
            page,
            limit,
            pages: Math.ceil(result.total / limit),
          },
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch organizer events',
        errorCode: 'FETCH_ORGANIZER_EVENTS_FAILED',
      });
    }
  }
}

export default new EventController();
