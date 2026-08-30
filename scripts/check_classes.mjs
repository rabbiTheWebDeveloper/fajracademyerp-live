import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_CONNECTION_STRING;
if (!mongoUri) {
  console.log("No MONGODB_CONNECTION_STRING in env");
  process.exit(1);
}

await mongoose.connect(mongoUri);

const onlineClasses = await mongoose.connection.collection("onlineclasses").find({}).toArray();
console.log("Total OnlineClasses in DB:", onlineClasses.length);
onlineClasses.forEach(c => {
  console.log("OnlineClass:", {
    _id: c._id,
    title: c.title,
    scheduledDate: c.scheduledDate,
    scheduledStartTime: c.scheduledStartTime,
    status: c.status,
    platform: c.platform,
    meetLink: c.meetLink,
    teacher: c.teacher
  });
});

const classSessions = await mongoose.connection.collection("classsessions").find({}).limit(10).toArray();
console.log("Total ClassSessions sample in DB:", classSessions.length);
classSessions.forEach(c => {
  console.log("ClassSession:", {
    _id: c._id,
    classId: c.classId,
    dayOfWeek: c.dayOfWeek,
    startTime: c.startTime,
    status: c.status,
    meetLink: c.meetLink,
    teacher: c.teacher,
    createdAt: c.createdAt
  });
});

await mongoose.disconnect();
