import { Schema, model, Document, Types } from 'mongoose';

export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  HELD = 'HELD',
  BOOKED = 'BOOKED',
}

export interface ISeat extends Document {
  eventId: Types.ObjectId;
  row: string;
  number: number;
  seatLabel: string;
  status: SeatStatus;
  holdUntil?: Date;
  ticketTypeId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const seatSchema = new Schema<ISeat>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    row: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 2,
    },
    number: {
      type: Number,
      required: true,
      min: 1,
    },
    seatLabel: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(SeatStatus),
      default: SeatStatus.AVAILABLE,
    },
    holdUntil: Date,
    ticketTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'TicketType',
    },
  },
  { timestamps: true }
);

seatSchema.index({ eventId: 1, seatLabel: 1 }, { unique: true });

export default model<ISeat>('Seat', seatSchema);
