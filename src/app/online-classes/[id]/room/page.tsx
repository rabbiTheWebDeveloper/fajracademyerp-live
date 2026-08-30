"use client";

import dynamic from "next/dynamic";
import { use } from "react";
import { Loader2 } from "lucide-react";

// Dynamic import with SSR disabled because LiveKit Video SDK relies on browser WebRTC APIs
const LiveKitClassroomContainer = dynamic(
  () => import("./LiveKitClassroomContainer"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold">Connecting to Fajr Academy Classroom</h2>
          <p className="text-xs text-slate-400">Initializing LiveKit WebRTC Video SDK engine...</p>
        </div>
      </div>
    ),
  }
);

export default function OnlineClassroomRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <LiveKitClassroomContainer classId={id} />;
}
