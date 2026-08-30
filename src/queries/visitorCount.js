import { visitorCountModel } from "@/model/visitorCount-model";
import { dbConnect } from "@/service/mongo";

// Function to get visitor counts
export async function getVisitorCounts() {
  await dbConnect();

  try {
    const visitorCounts = await visitorCountModel.find({}).sort({ date: 1 }).lean();

    // Map data to desired format
    const dailyVisitors = visitorCounts.map(visitor => ({
      date: new Date(visitor.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }),
      visitors: visitor.dailyCount
    }));

    return  JSON.parse(JSON.stringify(dailyVisitors));
  } catch (error) {
    console.error('Error retrieving visitor counts:', error);
    throw new Error('Failed to retrieve visitor counts');
  }
}

// Function to increment visitor count
export async function incrementVisitorCount() {
  await dbConnect();
  const today = new Date().toISOString().split('T')[0];

  try {
    // Check if today's document exists
    let visitorData = await visitorCountModel.findOne({ date: today });

    if (!visitorData) {
      // If it doesn't exist, create a new document for today
      visitorData = new visitorCountModel({ date: today, dailyCount: 0, totalCount: 0 });
    }

    // Increment today's visitor count
    visitorData.dailyCount += 1;
    visitorData.totalCount += 1;

    // Save the updated document
    await visitorData.save();

    // Update totalCount for all other days
    await visitorCountModel.updateMany(
      { date: { $ne: today } },
      { $inc: { totalCount: 1 } }
    );

    return visitorData;
  } catch (error) {
    console.error('Error updating visitor count:', error);
    throw new Error('Failed to update visitor count');
  }
      }
