import mongoose from 'mongoose';

const VisitorCountSchema = new mongoose.Schema(
  {
  date: {
    type: String,
    required: true,
    unique: true,
  },
  dailyCount: {
    type: Number,
    default: 0,
  },
  totalCount: {
    type: Number,
    default: 0,
  },
}
);

export const visitorCountModel= mongoose.models.VisitorCount ?? mongoose.model('VisitorCount', VisitorCountSchema);


