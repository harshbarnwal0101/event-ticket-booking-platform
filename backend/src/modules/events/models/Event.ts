import { Schema, model, Document, Types } from 'mongoose';

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface IEvent extends Document {
  title: string;
  description: string;
  organizerId: Types.ObjectId;
  venueId: Types.ObjectId;
  category: string;
  startDateTime: Date;
  endDateTime: Date;
  status: EventStatus;
  bannerUrl?: string;
  totalCapacity: number;
  ticketsAvailable: number;
  ticketsSold: number;
  basePrice: number;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    venueId: {
      type: Schema.Types.ObjectId,
      ref: 'Venue',
      required: true,
    },
    category: {
      type: String,
      enum: [
        'CONCERT',
        'CONFERENCE',
        'SPORTS',
        'THEATER',
        'FESTIVAL',
        'WORKSHOP',
        'SEMINAR',
        'EXHIBITION',
        'OTHER',
      ],
      required: true,
    },
    startDateTime: {
      type: Date,
      required: true,
    },
    endDateTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(EventStatus),
      default: EventStatus.DRAFT,
    },
    bannerUrl: {
      type: String,
      trim: true,
    },
    totalCapacity: {
      type: Number,
      required: true,
      min: 1,
    },
    ticketsAvailable: {
      type: Number,
      required: true,
      min: 0,
    },
    ticketsSold: {
      type: Number,
      default: 0,
      min: 0,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for frequently queried fields
eventSchema.index({ organizerId: 1, status: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ startDateTime: 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ isActive: 1, status: 1 });
eventSchema.index({ title: 'text', description: 'text' });

// Validate dates
eventSchema.pre<IEvent>('save', function (next) {
  if (this.endDateTime <= this.startDateTime) {
    throw new Error('End date must be after start date');
  }
  next();
});

export default model<IEvent>('Event', eventSchema);
