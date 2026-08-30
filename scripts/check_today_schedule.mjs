import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_CONNECTION_STRING;
await mongoose.connect(mongoUri);

const students = await mongoose.connection.collection("students").find({}).toArray();
console.log("Total students:", students.length);

const todayKey = "sunday";
const todayStudents = students.filter(s => {
  const rawDay = s.schedule?.dayOfWeek || s.schedule?.weekly_days_list?.[0] || "";
  const list = s.schedule?.weekly_days_list || [];
  return String(rawDay).toLowerCase().trim() === todayKey || list.map(d => String(d).toLowerCase().trim()).includes(todayKey);
});

console.log(`Students with schedule on ${todayKey}:`, todayStudents.length);
todayStudents.forEach(s => {
  console.log("Student:", s.fullName, "schedule:", s.schedule);
});

const todayClasses = await mongoose.connection.collection("classsessions").find({ dayOfWeek: todayKey }).toArray();
console.log(`ClassSessions on ${todayKey}:`, todayClasses.length);
todayClasses.forEach(c => {
  console.log("ClassSession:", c.classId, c.startTime, c.status);
});

await mongoose.disconnect();
