import { Request, Response } from 'express';
import Venue from '../models/Venue';

export class VenueController {
  async createVenue(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
          errorCode: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { name, description, city, state, country, zipCode, address, totalCapacity, amenities, contactEmail, contactPhone } = req.body;

      const venue = new Venue({
        name,
        description,
        city,
        state,
        country,
        zipCode,
        address,
        totalCapacity,
        amenities,
        contactEmail,
        contactPhone,
        createdBy: req.user.userId,
      });

      await venue.save();

      res.status(201).json({
        success: true,
        message: 'Venue created successfully',
        data: { venue },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create venue',
        errorCode: 'CREATE_VENUE_FAILED',
      });
    }
  }

  async searchVenues(req: Request, res: Response): Promise<void> {
    try {
      const { search, city, page = 1, limit = 10 } = req.query;

      const filters: any = { isActive: true };

      if (search) {
        filters.$text = { $search: search as string };
      }

      if (city) {
        filters.city = city;
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [venues, total] = await Promise.all([
        Venue.find(filters)
          .skip(skip)
          .limit(parseInt(limit as string))
          .lean() as any,
        Venue.countDocuments(filters),
      ]);

      res.status(200).json({
        success: true,
        data: {
          venues: venues as unknown as any[],
          pagination: {
            total,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            pages: Math.ceil(total / parseInt(limit as string)),
          },
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to search venues',
        errorCode: 'SEARCH_VENUES_FAILED',
      });
    }
  }

  async getVenue(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const venue = await Venue.findById(id);
      if (!venue) {
        res.status(404).json({
          success: false,
          message: 'Venue not found',
          errorCode: 'VENUE_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { venue },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch venue',
        errorCode: 'FETCH_VENUE_FAILED',
      });
    }
  }
}

export default new VenueController();
