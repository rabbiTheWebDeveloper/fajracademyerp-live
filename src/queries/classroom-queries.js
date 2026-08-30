import { dbConnect } from "@/service/mongo";
import { ClassroomModel } from "@/model/classroom-model";
import { CourseModel } from "@/model/course-model";
import { TeacherModel } from "@/model/teacher-model";
import { StudentModel } from "@/model/student-model";

const getModels = async () => {
  await dbConnect();
  return {
    Classroom: ClassroomModel,
    Course: CourseModel,
    Teacher: TeacherModel,
    Student: StudentModel,
  };
};

export async function getAllClassrooms() {
  try {
    const { Classroom } = await getModels();
    const classrooms = await Classroom.find()
      .select('_id classroomId name status students course teacher createdAt')
      .populate("course", "title")
      .populate("teacher", "fullName")
      .populate("students", "fullName studentId")
      .sort({ createdAt: -1 })
      .lean();
    return { success: true, classrooms };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function createClassroom(data) {
  try {
    const { Classroom } = await getModels();
    const newClassroom = await Classroom.create(data);
    return { success: true, classroom: newClassroom };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function getClassroomById(id) {
  try {
    const { Classroom } = await getModels();
    const classroom = await Classroom.findById(id)
      .populate("course", "title")
      .populate("teacher", "fullName")
      .populate("students", "fullName email studentId progress status")
      .lean();
    if (!classroom) return { success: false, message: "Classroom not found" };
    return { success: true, classroom };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function getTeacherClassrooms(teacherId) {
  try {
    const { Classroom } = await getModels();
    const classrooms = await Classroom.find({ teacher: teacherId })
      .select('_id classroomId name status students course sessions')
      .populate("course", "title")
      .populate("students", "_id fullName studentId")
      .sort({ createdAt: -1 })
      .lean();
    return { success: true, classrooms };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function addClassSession(classroomId, sessionData) {
  try {
    const { Classroom } = await getModels();
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) return { success: false, message: "Classroom not found" };
    
    // Check if we hit the limit (45 classes based on prompt)
    if (classroom.sessions.length >= 45) {
        return { success: false, message: "Maximum number of classes (45) reached for this classroom."}
    }

    classroom.sessions.push(sessionData);
    await classroom.save();
    
    return { success: true, session: classroom.sessions[classroom.sessions.length - 1] };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
