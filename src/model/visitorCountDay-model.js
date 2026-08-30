import mongoose from "mongoose";

const HourlyCountSchema = new mongoose.Schema({
  hour: {
    type: Number, // 0 to 23
    required: true,
  },
  count: {
    type: Number,
    default: 0,
  },
});

const VisitorCountSchema = new mongoose.Schema({
  date: {
    type: String, // YYYY-MM-DD
    required: true,
    unique: true,
  },
  hourlyCounts: {
    type: [HourlyCountSchema],
    default: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 })),
  },
  totalCount: {
    type: Number,
    default: 0,
  },
});

export const VisitorCountDayModel =
  mongoose.models.visitorCountDay ??
  mongoose.model("visitorCountDay", VisitorCountSchema);
