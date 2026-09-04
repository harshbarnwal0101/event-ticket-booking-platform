import { Request, Response } from 'express';
import ticketTypeService from '../services/ticket-type.service';

export class TicketTypeController {
  async listForEvent(req: Request, res: Response): Promise<void> {
    try {
      const eventId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const ticketTypes = await ticketTypeService.listForEvent(eventId);

      res.status(200).json({
        success: true,
        data: { ticketTypes },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch ticket types',
        errorCode: 'FETCH_TICKET_TYPES_FAILED',
      });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
          errorCode: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const eventId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const ticketType = await ticketTypeService.create(eventId, req.user.userId, {
        ...req.body,
        price: Number(req.body.price),
        quantity: Number(req.body.quantity),
        salesStart: req.body.salesStart ? new Date(req.body.salesStart) : undefined,
        salesEnd: req.body.salesEnd ? new Date(req.body.salesEnd) : undefined,
      });

      res.status(201).json({
        success: true,
        message: 'Ticket type created successfully',
        data: { ticketType },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create ticket type',
        errorCode: 'CREATE_TICKET_TYPE_FAILED',
      });
    }
  }
}

export default new TicketTypeController();
