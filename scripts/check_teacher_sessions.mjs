import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_CONNECTION_STRING;
await mongoose.connect(mongoUri);

const teacherId = new mongoose.Types.ObjectId("6a4b7e3bc28217766ac678c7");

const teacherSessions = await mongoose.connection.collection("classsessions").find({
  teacher: teacherId,
  dayOfWeek: "sunday"
}).toArray();

console.log("Teacher sessions for sunday:", teacherSessions.length);
teacherSessions.forEach(s => {
  console.log("Session:", s.classId, s.startTime, s.endTime, s.status, s.meetLink);
});

await mongoose.disconnect();
