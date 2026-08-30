import { replaceMongoIdInObject } from "@/lib/convertData";
import { VisitorCountDayModel } from "@/model/visitorCountDay-model";
import { dbConnect } from "@/service/mongo";

// Native date helpers — replaces moment (no dependency needed)
const todayStr  = () => new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
const currentHr = () => new Date().getHours();                   // 0-23


// Function to get visitor counts
// export async function getVisitorCounts() {
//   await dbConnect();

//   try {
//     const visitorCounts = await VisitorCountDayModel
//       .find({})
//       .sort({ date: 1 })
//       .lean();

//     // Map data to desired format
//     const dailyVisitors = visitorCounts.map((visitor) => ({
//       date: new Date(visitor.date).toLocaleDateString("en-US", {
//         year: "numeric",
//         month: "2-digit",
//         day: "2-digit",
//       }),
//       visitors: visitor.dailyCount,
//     }));

//     return dailyVisitors;
//   } catch (error) {
//     console.error("Error retrieving visitor counts:", error);
//     throw new Error("Failed to retrieve visitor counts");
//   }
// }

// Function to increment visitor count
// export const updateVisitorCount = async (date, hour) => {
//   await dbConnect();
//   try {
//     const visitorCount = await VisitorCountDayModel.findOne({ date });

//     if (!visitorCount) {
//       const newVisitorCount = new VisitorCountDayModel({ date });
//       await newVisitorCount.save();
//       newVisitorCount.hourlyCounts[hour].count += 1;
//       newVisitorCount.totalCount += 1;
//       await newVisitorCount.save();
//     } else {
//       visitorCount.hourlyCounts[hour].count += 1;
//       visitorCount.totalCount += 1;
//       await visitorCount.save();
//     }
//   } catch (error) {
//     console.error('Error updating visitor count:', error);
//   }
// };

export const incrementCurrentVisitorCount = async () => {
  await dbConnect();
  const currentDate = todayStr();
  const currentHour = currentHr();

  try {
    // Check if the document for the current date exists
    let visitorCountDay = await VisitorCountDayModel.findOne({
      date: currentDate,
    });

    // If the document doesn't exist, create it
    if (!visitorCountDay) {
      visitorCountDay = await VisitorCountDayModel.create({
        date: currentDate,
        hourlyCounts: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          count: 0,
        })),
        totalCount: 0,
      });
    }

    // Update the visitor count for the current hour
    const updatedVisitorCountDay = await VisitorCountDayModel.findOneAndUpdate(
      { date: currentDate, "hourlyCounts.hour": currentHour },
      {
        $inc: {
          "hourlyCounts.$.count": 1,
          totalCount: 1,
        },
      },
      { returnDocument: "after" }
    );

    return updatedVisitorCountDay;
  } catch (error) {
    // throw new Error(error.message);
  }
};

export const getCurrentVisitorCount = async () => {
  await dbConnect();
  const currentDate = todayStr();

  try {
    let visitorCountDay = await VisitorCountDayModel.findOne({
      date: currentDate,
    }).lean();

    return replaceMongoIdInObject( JSON.parse(JSON.stringify(visitorCountDay)));
  } catch (error) {
    // throw new Error(error.message);
  }
};
