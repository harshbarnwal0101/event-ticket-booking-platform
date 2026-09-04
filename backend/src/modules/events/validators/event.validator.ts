import Joi from 'joi';

export const createEventValidator = {
  body: Joi.object({
    title: Joi.string().required().max(200).trim(),
    description: Joi.string().required().max(5000).trim(),
    venueId: Joi.string().required().pattern(/^[0-9a-fA-F]{24}$/),
    category: Joi.string()
      .required()
      .valid(
        'CONCERT',
        'CONFERENCE',
        'SPORTS',
        'THEATER',
        'FESTIVAL',
        'WORKSHOP',
        'SEMINAR',
        'EXHIBITION',
        'OTHER'
      ),
    startDateTime: Joi.date().required().iso(),
    endDateTime: Joi.date().required().iso().greater(Joi.ref('startDateTime')),
    totalCapacity: Joi.number().required().integer().min(1),
    basePrice: Joi.number().required().min(0),
    bannerUrl: Joi.string().uri().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  }),
};

export const updateEventValidator = {
  body: Joi.object({
    title: Joi.string().max(200).trim().optional(),
    description: Joi.string().max(5000).trim().optional(),
    category: Joi.string()
      .valid(
        'CONCERT',
        'CONFERENCE',
        'SPORTS',
        'THEATER',
        'FESTIVAL',
        'WORKSHOP',
        'SEMINAR',
        'EXHIBITION',
        'OTHER'
      )
      .optional(),
    startDateTime: Joi.date().iso().optional(),
    endDateTime: Joi.date().iso().optional(),
    status: Joi.string()
      .valid('DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED')
      .optional(),
    basePrice: Joi.number().min(0).optional(),
    bannerUrl: Joi.string().uri().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  }),
};

export const searchEventsValidator = {
  query: Joi.object({
    search: Joi.string().optional().trim(),
    category: Joi.string().optional(),
    city: Joi.string().optional().trim(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('date', 'price', 'popularity').default('date'),
  }),
};

export const eventIdValidator = {
  params: Joi.object({
    id: Joi.string().required().pattern(/^[0-9a-fA-F]{24}$/),
  }),
};
