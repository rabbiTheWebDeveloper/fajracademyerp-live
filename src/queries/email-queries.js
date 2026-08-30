import { dbConnect } from "@/service/mongo";
import { EmailLogModel } from "@/model/emailLog-model";

export async function getEmailLogs({ page = 1, limit = 10 } = {}) {
  await dbConnect();
  
  const skip = (page - 1) * limit;
  const logs = await EmailLogModel.find({})
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
    
  const total = await EmailLogModel.countDocuments({});
  
  return {
    logs: JSON.parse(JSON.stringify(logs)),
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page
  };
}

export async function logSentEmail({ to, subject, body, status, sentBy, error }) {
  await dbConnect();
  
  const log = await EmailLogModel.create({
    to,
    subject,
    body,
    status,
    sentBy,
    error
  });
  
  return JSON.parse(JSON.stringify(log));
}
