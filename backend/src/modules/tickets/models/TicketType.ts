import { Schema, model, Document, Types } from 'mongoose';

export interface ITicketType extends Document {
  eventId: Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  availableQuantity: number;
  salesStart?: Date;
  salesEnd?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ticketTypeSchema = new Schema<ITicketType>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    salesStart: Date,
    salesEnd: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

ticketTypeSchema.index({ eventId: 1, isActive: 1 });

ticketTypeSchema.pre<ITicketType>('save', function (next) {
  if (this.availableQuantity > this.quantity) {
    throw new Error('Available quantity cannot exceed total quantity');
  }
  if (this.salesStart && this.salesEnd && this.salesEnd <= this.salesStart) {
    throw new Error('Sales end must be after sales start');
  }
  next();
});

export default model<ITicketType>('TicketType', ticketTypeSchema);
