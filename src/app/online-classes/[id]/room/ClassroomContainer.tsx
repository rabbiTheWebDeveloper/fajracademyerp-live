"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ZoomVideo from "@zoom/videosdk";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  Users,
  MessageSquare,
  PhoneOff,
  Settings,
  Maximize2,
  Minimize2,
  Sparkles,
  Loader2,
  Send,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Volume2,
  VolumeX,
  Radio,
  ChevronDown,
  LayoutGrid,
  Square,
  Palette,
  Eye,
  Tv,
} from "lucide-react";
import WhiteboardCanvas from "./WhiteboardCanvas";

interface ClassroomContainerProps {
  classId: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  isSelf: boolean;
}

type StageMode = "grid" | "spotlight" | "screen" | "whiteboard";

export default function ClassroomContainer({ classId }: ClassroomContainerProps) {
  const router = useRouter();

  // Connection & Room States
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [clientInstance, setClientInstance] = useState<any>(null);
  const [mediaStream, setMediaStream] = useState<any>(null);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);

  // Classroom Media Controls
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isScreenSharedByOther, setIsScreenSharedByOther] = useState(false);
  const [screenSharerName, setScreenSharerName] = useState("");
  const [activeShareUserId, setActiveShareUserId] = useState<number | null>(null);

  // Stage & View Modes
  const [stageMode, setStageMode] = useState<StageMode>("grid");
  const [spotlightUserId, setSpotlightUserId] = useState<number | null>(null);
  const [isWhiteboardActive, setIsWhiteboardActive] = useState(false);
  const [incomingWhiteboardCmd, setIncomingWhiteboardCmd] = useState<any>(null);

  // UI Panels
  const [activeSideDrawer, setActiveSideDrawer] = useState<"participants" | "chat" | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Participant list & Chat messages
  const [participants, setParticipants] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Elapsed Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Video & Canvas references
  const selfVideoContainerRef = useRef<HTMLDivElement>(null);
  const remoteVideoGridRef = useRef<HTMLDivElement>(null);
  const selfShareVideoRef = useRef<HTMLVideoElement>(null);
  const selfShareCanvasRef = useRef<HTMLCanvasElement>(null);
  const remoteShareCanvasRef = useRef<HTMLCanvasElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Device list
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState("");
  const [selectedCam, setSelectedCam] = useState("");

  // Timer Tick
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(s)}`;
    return `${pad(mins)}:${pad(s)}`;
  };

  // ─── Initialize Zoom Video SDK & Join Session ─────────────────────────────
  useEffect(() => {
    let client: any = null;
    let stream: any = null;
    let currentAttendanceId: string | null = null;

    const initZoom = async () => {
      try {
        setConnecting(true);
        setError(null);

        // 1. Fetch JWT Token & Session details from backend
        const tokenRes = await fetch(`/api/online-classes/${classId}/zoom-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const tokenData = await tokenRes.json();
        if (!tokenData.success) {
          throw new Error(tokenData.message || "Failed to generate Zoom classroom token.");
        }

        setSessionInfo(tokenData);

        // 2. Initialize Zoom Video SDK client
        client = ZoomVideo.createClient();
        setClientInstance(client);

        await client.init("en-US", "Global", { patchJsMedia: true });

        // 3. Register SDK Event Listeners
        client.on("user-added", () => {
          setParticipants(client.getAllUser());
        });

        client.on("user-removed", () => {
          setParticipants(client.getAllUser());
        });

        client.on("user-updated", () => {
          setParticipants(client.getAllUser());
        });

        client.on("peer-video-state-change", async (payload: any) => {
          setParticipants(client.getAllUser());
          if (stream) {
            if (payload.action === "Start") {
              const videoElement = await stream.attachVideo(payload.userId, 2);
              const container = document.getElementById(`user-video-${payload.userId}`);
              if (container && videoElement) {
                container.innerHTML = "";
                container.appendChild(videoElement);
              }
            } else if (payload.action === "Stop") {
              await stream.detachVideo(payload.userId);
              const container = document.getElementById(`user-video-${payload.userId}`);
              if (container) container.innerHTML = "";
            }
          }
        });

        client.on("peer-share-state-change", async (payload: any) => {
          if (payload.action === "Start") {
            setIsScreenSharedByOther(true);
            setActiveShareUserId(payload.userId);
            const user = client.getUser(payload.userId);
            setScreenSharerName(user?.displayName || "Participant");
            setStageMode("screen");

            // Attach remote screen share (VideoPlayer or Canvas)
            if (stream) {
              try {
                if (typeof stream.attachShareView === "function") {
                  const shareElement = await stream.attachShareView(payload.userId);
                  const container = document.getElementById("remote-share-container");
                  if (container && shareElement) {
                    container.innerHTML = "";
                    container.appendChild(shareElement);
                  }
                } else if (remoteShareCanvasRef.current) {
                  await stream.startShareView(remoteShareCanvasRef.current, payload.userId);
                }
              } catch (shareViewErr) {
                console.warn("Could not attach remote share view:", shareViewErr);
              }
            }
          } else if (payload.action === "Stop") {
            setIsScreenSharedByOther(false);
            setActiveShareUserId(null);
            setScreenSharerName("");
            if (stream) {
              try {
                if (typeof stream.detachShareView === "function") {
                  await stream.detachShareView(payload.userId);
                } else {
                  await stream.stopShareView();
                }
              } catch {}
            }
            const container = document.getElementById("remote-share-container");
            if (container) container.innerHTML = "";
            setStageMode((prev) => (prev === "screen" ? "grid" : prev));
          }
        });

        client.on("passively-stop-share", () => {
          setIsSharingScreen(false);
          setStageMode((prev) => (prev === "screen" ? "grid" : prev));
        });

        // In-class Chat Listener
        client.on("chat-on-message", (payload: any) => {
          const newMsg: ChatMessage = {
            id: String(Date.now() + Math.random()),
            sender: payload.sender?.name || "Participant",
            text: payload.message,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isSelf: payload.sender?.userId === client.getCurrentUserInfo()?.userId,
          };
          setChatMessages((prev) => [...prev, newMsg]);

          if (activeSideDrawer !== "chat") {
            setUnreadChatCount((prev) => prev + 1);
          }
        });

        // Command Channel Message (for real-time whiteboard synchronization)
        client.on("command-channel-message", (payload: any) => {
          try {
            const data = JSON.parse(payload.text);
            if (data.action === "TOGGLE_WHITEBOARD") {
              setIsWhiteboardActive(data.payload.active);
              if (data.payload.active) {
                setStageMode("whiteboard");
              } else {
                setStageMode("grid");
              }
            } else {
              setIncomingWhiteboardCmd({
                action: data.action,
                payload: data.payload,
                timestamp: Date.now(),
              });
            }
          } catch (parseErr) {
            console.warn("Error parsing command message:", parseErr);
          }
        });

        // 4. Join Zoom Video Session
        await client.join(
          tokenData.sessionName,
          tokenData.token,
          tokenData.userName,
          tokenData.sessionPassword
        );

        stream = client.getMediaStream();
        setMediaStream(stream);

        // 5. Start Audio on join
        try {
          await stream.startAudio();
          setIsAudioMuted(false);
        } catch (audioErr) {
          console.warn("Audio autostart prevented by browser permissions:", audioErr);
        }

        // 6. Record Join in DB for attendance tracking
        const joinRes = await fetch(`/api/online-classes/${classId}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const joinData = await joinRes.json();
        if (joinData.success && joinData.attendanceId) {
          currentAttendanceId = joinData.attendanceId;
          setAttendanceId(joinData.attendanceId);
        }

        // 7. Get Device List
        try {
          const devs = await navigator.mediaDevices.enumerateDevices();
          setAudioDevices(devs.filter((d) => d.kind === "audioinput"));
          setVideoDevices(devs.filter((d) => d.kind === "videoinput"));
        } catch (devErr) {
          console.warn("Could not enumerate media devices:", devErr);
        }

        // 8. Update initial participants
        setParticipants(client.getAllUser());
        setConnecting(false);
      } catch (err: any) {
        console.error("Zoom Classroom Connection Error:", err);
        setError(err.message || "Failed to join online classroom.");
        setConnecting(false);
      }
    };

    initZoom();

    // ─── Cleanup on Page Unload / Component Unmount ──────────────────────
    const handleLeaveCleanup = async () => {
      if (currentAttendanceId) {
        navigator.sendBeacon(
          `/api/online-classes/${classId}/leave`,
          JSON.stringify({ attendanceId: currentAttendanceId })
        );
      }
      if (client) {
        try {
          await client.leave();
        } catch {}
      }
    };

    window.addEventListener("beforeunload", handleLeaveCleanup);

    return () => {
      window.removeEventListener("beforeunload", handleLeaveCleanup);
      handleLeaveCleanup();
    };
  }, [classId]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (activeSideDrawer === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnreadChatCount(0);
    }
  }, [chatMessages, activeSideDrawer]);

  // Synchronize video attachments across mode transitions (Grid / Spotlight)
  useEffect(() => {
    if (!mediaStream || !clientInstance) return;

    const currentUserId = clientInstance.getCurrentUserInfo()?.userId;

    // Attach self video if camera is on
    if (isVideoOn && currentUserId && selfVideoContainerRef.current) {
      mediaStream
        .attachVideo(currentUserId, 2)
        .then((el: any) => {
          if (selfVideoContainerRef.current && el) {
            selfVideoContainerRef.current.innerHTML = "";
            selfVideoContainerRef.current.appendChild(el);
          }
        })
        .catch(() => {});
    }

    // Attach remote participants videos
    participants.forEach((p) => {
      if (p.userId !== currentUserId && p.bVideoOn) {
        mediaStream
          .attachVideo(p.userId, 2)
          .then((el: any) => {
            const container = document.getElementById(`user-video-${p.userId}`);
            if (container && el) {
              container.innerHTML = "";
              container.appendChild(el);
            }
          })
          .catch(() => {});
      }
    });
  }, [mediaStream, clientInstance, isVideoOn, stageMode, spotlightUserId, participants]);

  // ─── Broadcast Whiteboard Command helper ──────────────────────────────────
  const sendWhiteboardCommand = useCallback(
    (action: string, payload: any) => {
      if (!clientInstance) return;
      try {
        const commandClient = clientInstance.getCommandClient();
        commandClient.send(JSON.stringify({ action, payload }));
      } catch (cmdErr) {
        console.warn("Could not send whiteboard command:", cmdErr);
      }
    },
    [clientInstance]
  );

  // Toggle Whiteboard mode
  const toggleWhiteboard = () => {
    const nextState = !isWhiteboardActive;
    setIsWhiteboardActive(nextState);
    if (nextState) {
      setStageMode("whiteboard");
    } else {
      setStageMode("grid");
    }
    // Broadcast to peers
    sendWhiteboardCommand("TOGGLE_WHITEBOARD", { active: nextState });
  };

  // ─── Media Stream Handlers ────────────────────────────────────────────────
  const toggleMicrophone = async () => {
    if (!mediaStream) return;
    try {
      if (isAudioMuted) {
        await mediaStream.unmuteAudio();
        setIsAudioMuted(false);
      } else {
        await mediaStream.muteAudio();
        setIsAudioMuted(true);
      }
    } catch (err) {
      console.error("Failed to toggle microphone:", err);
    }
  };

  const toggleCamera = async () => {
    if (!mediaStream || !clientInstance) return;
    try {
      const currentUserId = clientInstance.getCurrentUserInfo()?.userId;
      if (isVideoOn) {
        await mediaStream.detachVideo(currentUserId);
        await mediaStream.stopVideo();
        if (selfVideoContainerRef.current) {
          selfVideoContainerRef.current.innerHTML = "";
        }
        setIsVideoOn(false);
      } else {
        await mediaStream.startVideo();
        const element = await mediaStream.attachVideo(currentUserId, 2);
        if (selfVideoContainerRef.current && element) {
          selfVideoContainerRef.current.innerHTML = "";
          selfVideoContainerRef.current.appendChild(element);
        }
        setIsVideoOn(true);
      }
    } catch (err: any) {
      console.error("Failed to toggle camera:", err);
      alert("Unable to access camera: " + (err.message || "Permission denied"));
    }
  };

  const toggleScreenShare = async () => {
    if (!mediaStream) return;
    try {
      if (isSharingScreen) {
        await mediaStream.stopShareScreen();
        setIsSharingScreen(false);
        setStageMode("grid");
      } else {
        // Switch to screen stage so elements are active and mounted
        setStageMode("screen");
        // Give React a tick to mount video element
        await new Promise((r) => setTimeout(r, 60));

        const shareVideo = (selfShareVideoRef.current || document.getElementById("self-share-video")) as HTMLVideoElement | null;
        const shareCanvas = (selfShareCanvasRef.current || document.getElementById("self-share-canvas")) as HTMLCanvasElement | null;

        if (shareVideo) {
          try {
            await mediaStream.startShareScreen(shareVideo);
            setIsSharingScreen(true);
          } catch (vidErr: any) {
            // Fallback to canvas if WebCodecs is not active
            if (vidErr?.errorCode === 6003 && shareCanvas) {
              if (!shareCanvas.width) shareCanvas.width = 1920;
              if (!shareCanvas.height) shareCanvas.height = 1080;
              await mediaStream.startShareScreen(shareCanvas);
              setIsSharingScreen(true);
            } else {
              throw vidErr;
            }
          }
        } else if (shareCanvas) {
          if (!shareCanvas.width) shareCanvas.width = 1920;
          if (!shareCanvas.height) shareCanvas.height = 1080;
          await mediaStream.startShareScreen(shareCanvas);
          setIsSharingScreen(true);
        }
      }
    } catch (err: any) {
      if (
        err?.type === "USER_CANCELLED" ||
        err?.name === "NotAllowedError" ||
        err?.message?.includes("Permission denied") ||
        (typeof err === "object" && Object.keys(err).length === 0)
      ) {
        console.log("Screen sharing cancelled or closed by user.");
      } else {
        console.warn("Screen share notice:", err);
      }
      setIsSharingScreen(false);
      setStageMode((prev) => (prev === "screen" ? "grid" : prev));
    }
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !clientInstance) return;

    try {
      const chatClient = clientInstance.getChatClient();
      await chatClient.sendToAll(chatInput.trim());

      const selfMsg: ChatMessage = {
        id: String(Date.now()),
        sender: sessionInfo?.userName || "Me",
        text: chatInput.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isSelf: true,
      };
      setChatMessages((prev) => [...prev, selfMsg]);
      setChatInput("");
    } catch (err) {
      console.error("Failed to send chat message:", err);
    }
  };

  const getExitRedirectUrl = () => {
    if (sessionInfo?.userRole === "teacher") {
      return `/teacher/online-classes/${classId}`;
    }
    if (sessionInfo?.userRole === "student") {
      return `/student/online-classes/${classId}`;
    }
    return `/online-classes/${classId}`;
  };

  const handleLeaveClass = async () => {
    setActionLoading(true);
    const exitUrl = getExitRedirectUrl();
    try {
      if (attendanceId) {
        await fetch(`/api/online-classes/${classId}/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attendanceId }),
        });
      }
      if (clientInstance) {
        await clientInstance.leave();
      }
      router.push(exitUrl);
    } catch (err) {
      console.error("Error leaving class:", err);
      router.push(exitUrl);
    }
  };

  const handleEndClassForEveryone = async () => {
    setActionLoading(true);
    const exitUrl = getExitRedirectUrl();
    try {
      await fetch(`/api/online-classes/${classId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (clientInstance) {
        await clientInstance.leave(true); // true = end session for all
      }
      router.push(exitUrl);
    } catch (err) {
      console.error("Error ending class:", err);
      router.push(exitUrl);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // ─── Loading Screen ───────────────────────────────────────────────────────
  if (connecting) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="relative w-20 h-20 rounded-3xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shadow-2xl">
          <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Joining Live Classroom</h2>
          <p className="text-xs text-slate-400">Verifying role & securing WebRTC connection...</p>
        </div>
      </div>
    );
  }

  // ─── Error Screen ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold">Classroom Connection Error</h2>
            <p className="text-xs text-slate-400">{error}</p>
          </div>

          <div className="text-xs text-slate-500 bg-slate-950/60 p-3.5 rounded-xl text-left space-y-1">
            <p className="font-semibold text-slate-400">Troubleshooting:</p>
            <p>• Make sure Zoom credentials are set in <code className="text-blue-400">.env</code></p>
            <p>• Check your camera and microphone permissions</p>
            <p>• Ensure your user account is assigned to this online class</p>
          </div>

          <div className="flex gap-3">
            <Link
              href={getExitRedirectUrl()}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors text-center"
            >
              Back to Portal
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isHost = sessionInfo?.isHost;
  const currentUserId = clientInstance?.getCurrentUserInfo()?.userId;
  const remoteUsers = participants.filter((p) => p.userId !== currentUserId);

  return (
    <div className="h-screen w-screen max-w-full overflow-hidden bg-slate-950 text-slate-100 flex flex-col justify-between select-none">
      {/* Global styles for Zoom Video Player elements */}
      <style jsx global>{`
        video-player {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
          position: absolute !important;
          inset: 0 !important;
          object-fit: cover !important;
        }
        video-player > video,
        video-player > canvas,
        video-player video,
        video-player canvas {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
        }
      `}</style>

      {/* ─── Classroom Top Header Bar ───────────────────────────────────────── */}
      <header className="h-16 flex-shrink-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight line-clamp-1">
                {sessionInfo?.classTitle || "Fajr Academy Live Classroom"}
              </h1>
              {isHost && (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                  Host
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>{sessionInfo?.userName}</span>
              <span>•</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Connected
              </span>
            </p>
          </div>
        </div>

        {/* View Mode Switcher & Top Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Stage View Mode Selector */}
          <div className="hidden md:flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 text-xs">
            <button
              onClick={() => {
                setStageMode("grid");
                setSpotlightUserId(null);
              }}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold transition-all ${
                stageMode === "grid"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grid
            </button>

            <button
              onClick={() => {
                setStageMode("spotlight");
                if (!spotlightUserId) {
                  setSpotlightUserId(remoteUsers[0]?.userId || currentUserId);
                }
              }}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold transition-all ${
                stageMode === "spotlight"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Spotlight Speaker Mode"
            >
              <Square className="w-3.5 h-3.5" />
              Spotlight
            </button>

            <button
              onClick={toggleWhiteboard}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold transition-all ${
                stageMode === "whiteboard"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Interactive Whiteboard"
            >
              <Palette className="w-3.5 h-3.5" />
              Whiteboard
            </button>
          </div>

          {/* Live Duration Timer */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs font-mono font-bold text-slate-200">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{formatElapsed(elapsedSeconds)}</span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ─── Main Classroom Stage ────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 w-full relative flex overflow-hidden p-3 sm:p-4 gap-4">
        <div className="flex-1 min-h-0 w-full h-full flex flex-col items-center justify-center relative">
          {/* ─── Mode 1: Interactive Whiteboard ────────────────────────────── */}
          {stageMode === "whiteboard" && (
            <div className="w-full h-full min-h-0 relative animate-in zoom-in-95 duration-200">
              <WhiteboardCanvas
                isHost={isHost}
                onSendCommand={sendWhiteboardCommand}
                incomingCommand={incomingWhiteboardCmd}
                onClose={() => setStageMode("grid")}
              />
            </div>
          )}

          {/* ─── Mode 2: Screen Share Mode (Full Stage) ────────────────────── */}
          {stageMode === "screen" && (
            <div className="w-full h-full min-h-0 relative bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center shadow-2xl">
              <div className="absolute top-3 left-3 z-20 bg-blue-600/90 text-white text-xs px-3.5 py-1.5 rounded-full shadow-lg backdrop-blur-md flex items-center gap-2 font-bold">
                <MonitorUp className="w-4 h-4 animate-pulse" />
                {isSharingScreen ? "You are sharing your screen" : `${screenSharerName || "Participant"} is sharing screen`}
              </div>

              {/* Self Share Video Element (WebCodecs) */}
              <video
                ref={selfShareVideoRef}
                id="self-share-video"
                playsInline
                muted
                autoPlay
                className={`w-full h-full object-contain bg-black ${isSharingScreen && !isScreenSharedByOther ? "block" : "hidden"}`}
              />

              {/* Self Share Canvas Fallback */}
              <canvas
                ref={selfShareCanvasRef}
                id="self-share-canvas"
                className="hidden"
              />

              {/* Remote Share Container (Supports attachShareView VideoPlayer element & Canvas) */}
              <div
                id="remote-share-container"
                className={`w-full h-full relative flex items-center justify-center overflow-hidden bg-black [&>video-player]:w-full [&>video-player]:h-full [&>video]:w-full [&>video]:h-full [&>video]:object-contain [&>canvas]:w-full [&>canvas]:h-full [&>canvas]:object-contain ${isScreenSharedByOther ? "block" : "hidden"}`}
              >
                <canvas
                  ref={remoteShareCanvasRef}
                  id="remote-share-canvas"
                  className="w-full h-full object-contain bg-black"
                />
              </div>

              {/* Self Screen Share placeholder message */}
              {isSharingScreen && !isScreenSharedByOther && (
                <div className="text-center p-8 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-xl">
                    <MonitorUp className="w-8 h-8 animate-bounce" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Your Screen is Being Shared Live</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    All attendees can see your shared screen in real-time high resolution.
                  </p>
                  <button
                    onClick={toggleScreenShare}
                    className="mt-3 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20"
                  >
                    Stop Screen Sharing
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── Mode 3: Spotlight Speaker Mode ────────────────────────────── */}
          {stageMode === "spotlight" && (
            <div className="w-full h-full min-h-0 flex flex-col relative gap-3">
              {/* Main Spotlight Video Container */}
              <div className="flex-1 min-h-0 w-full relative bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl">
                {spotlightUserId === currentUserId ? (
                  <>
                    <div
                      ref={selfVideoContainerRef}
                      className="w-full h-full absolute inset-0 flex items-center justify-center overflow-hidden bg-slate-950 [&>video-player]:w-full [&>video-player]:h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
                    />
                    {!isVideoOn && (
                      <div className="flex flex-col items-center gap-3 z-10">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-3xl shadow-2xl border-4 border-slate-700">
                          {sessionInfo?.userName?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <p className="text-sm font-semibold text-slate-300">{sessionInfo?.userName} (You)</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div
                      id={`user-video-${spotlightUserId}`}
                      className="w-full h-full absolute inset-0 flex items-center justify-center overflow-hidden bg-slate-950 [&>video-player]:w-full [&>video-player]:h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
                    />
                    <div className="flex flex-col items-center gap-3 z-10">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold text-3xl shadow-2xl border-4 border-slate-700">
                        {participants.find((p) => p.userId === spotlightUserId)?.displayName?.charAt(0) || "P"}
                      </div>
                      <p className="text-sm font-semibold text-slate-300">
                        {participants.find((p) => p.userId === spotlightUserId)?.displayName || "Participant"}
                      </p>
                    </div>
                  </>
                )}

                {/* Spotlight Overlay Badge */}
                <div className="absolute bottom-4 left-4 z-20 bg-slate-950/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-bold flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    Spotlight:{" "}
                    {spotlightUserId === currentUserId
                      ? `${sessionInfo?.userName} (You)`
                      : participants.find((p) => p.userId === spotlightUserId)?.displayName || "Participant"}
                  </span>
                </div>
              </div>

              {/* Floating Thumbnails Row */}
              <div className="h-20 flex-shrink-0 flex items-center gap-3 overflow-x-auto pb-1">
                {/* Self thumb */}
                <button
                  onClick={() => setSpotlightUserId(currentUserId)}
                  className={`h-full aspect-video rounded-xl bg-slate-900 border overflow-hidden relative flex-shrink-0 flex items-center justify-center transition-all ${
                    spotlightUserId === currentUserId ? "border-blue-500 scale-105 shadow-lg" : "border-slate-800"
                  }`}
                >
                  <span className="text-xs font-bold text-white">{sessionInfo?.userName} (You)</span>
                </button>

                {/* Remote thumbs */}
                {remoteUsers.map((u) => (
                  <button
                    key={u.userId}
                    onClick={() => setSpotlightUserId(u.userId)}
                    className={`h-full aspect-video rounded-xl bg-slate-900 border overflow-hidden relative flex-shrink-0 flex items-center justify-center transition-all ${
                      spotlightUserId === u.userId ? "border-blue-500 scale-105 shadow-lg" : "border-slate-800"
                    }`}
                  >
                    <span className="text-xs font-bold text-white">{u.displayName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Mode 4: Responsive Multi-Participant Grid View ─────────────── */}
          {stageMode === "grid" && (
            <div
              ref={remoteVideoGridRef}
              className={`w-full h-full min-h-0 grid gap-3 sm:gap-4 ${
                remoteUsers.length === 0
                  ? "grid-cols-1 grid-rows-1"
                  : remoteUsers.length === 1
                  ? "grid-cols-1 md:grid-cols-2 grid-rows-2 md:grid-rows-1"
                  : remoteUsers.length <= 3
                  ? "grid-cols-2 grid-rows-2"
                  : "grid-cols-2 md:grid-cols-3 grid-rows-3 md:grid-rows-2"
              }`}
            >
              {/* Self Video Slot */}
              <div
                onDoubleClick={() => {
                  setSpotlightUserId(currentUserId);
                  setStageMode("spotlight");
                }}
                className="w-full h-full min-h-0 min-w-0 relative bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-lg group cursor-pointer hover:border-slate-700 transition-all"
                title="Double click to maximize"
              >
                <div
                  ref={selfVideoContainerRef}
                  className="w-full h-full absolute inset-0 flex items-center justify-center overflow-hidden bg-slate-950 [&>video-player]:w-full [&>video-player]:h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
                />

                {!isVideoOn && (
                  <div className="flex flex-col items-center gap-3 z-10">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-xl border-2 border-slate-700">
                      {sessionInfo?.userName?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <p className="text-xs font-semibold text-slate-300">Camera is Off</p>
                  </div>
                )}

                {/* Self Info Overlay */}
                <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-medium">
                  <span className="text-white font-bold">{sessionInfo?.userName} (You)</span>
                  {isAudioMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>

                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 px-2 py-1 rounded-lg text-[10px] text-slate-300 font-semibold">
                  Double click to maximize
                </div>
              </div>

              {/* Remote Participants Video Slots */}
              {remoteUsers.map((user) => (
                <div
                  key={user.userId}
                  onDoubleClick={() => {
                    setSpotlightUserId(user.userId);
                    setStageMode("spotlight");
                  }}
                  className="w-full h-full min-h-0 min-w-0 relative bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-lg group cursor-pointer hover:border-slate-700 transition-all"
                  title="Double click to maximize"
                >
                  <div
                    id={`user-video-${user.userId}`}
                    className="w-full h-full absolute inset-0 flex items-center justify-center overflow-hidden bg-slate-950 [&>video-player]:w-full [&>video-player]:h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
                  />

                  {/* Default Avatar */}
                  <div className="flex flex-col items-center gap-3 z-10">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold text-2xl shadow-xl border-2 border-slate-700">
                      {user.displayName?.charAt(0)?.toUpperCase() || "P"}
                    </div>
                    <p className="text-xs font-semibold text-slate-300">{user.displayName || "Participant"}</p>
                  </div>

                  {/* Remote Participant Overlay */}
                  <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-medium">
                    <span className="text-white font-bold">{user.displayName || "Participant"}</span>
                    {user.muted ? (
                      <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>

                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 px-2 py-1 rounded-lg text-[10px] text-slate-300 font-semibold">
                    Double click to maximize
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Right Drawer: Participants or Chat ─────────────────────────── */}
        {activeSideDrawer && (
          <aside className="w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl z-30 animate-in slide-in-from-right-4 duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                {activeSideDrawer === "participants" ? (
                  <>
                    <Users className="w-4 h-4 text-blue-400" />
                    <span>In-Class Attendees ({participants.length})</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <span>In-Class Live Chat</span>
                  </>
                )}
              </div>

              <button
                onClick={() => setActiveSideDrawer(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Participants Content */}
            {activeSideDrawer === "participants" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {participants.map((p) => (
                  <div
                    key={p.userId}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center justify-center font-bold text-xs">
                        {p.displayName?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">
                          {p.displayName} {p.userId === currentUserId && "(You)"}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize">
                          {p.isHost ? "Host / Teacher" : "Student"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400">
                      {p.muted ? (
                        <MicOff className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {p.bVideoOn ? (
                        <Video className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <VideoOff className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Chat Content */}
            {activeSideDrawer === "chat" && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 space-y-1">
                      <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
                      <p className="text-xs font-semibold">No chat messages yet</p>
                      <p className="text-[10px]">Send a greeting to all class participants</p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"}`}
                      >
                        <span className="text-[10px] text-slate-400 font-medium mb-1">
                          {msg.sender} • {msg.timestamp}
                        </span>
                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs font-medium leading-relaxed ${
                            msg.isSelf
                              ? "bg-blue-600 text-white rounded-br-none"
                              : "bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat Input Box */}
                <form
                  onSubmit={sendChatMessage}
                  className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Type a message to everyone..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-colors shadow-md"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </aside>
        )}
      </main>

      {/* ─── Floating Bottom Control Dock ───────────────────────────────────── */}
      <footer className="h-20 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 px-4 sm:px-8 flex items-center justify-between z-30">
        {/* Left Status */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Zoom Video SDK Active</span>
        </div>

        {/* Center Control Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 mx-auto sm:mx-0">
          {/* Microphone Toggle */}
          <button
            onClick={toggleMicrophone}
            className={`p-3.5 rounded-2xl flex items-center justify-center transition-all ${
              isAudioMuted
                ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
            }`}
            title={isAudioMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera Toggle */}
          <button
            onClick={toggleCamera}
            className={`p-3.5 rounded-2xl flex items-center justify-center transition-all ${
              !isVideoOn
                ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
            }`}
            title={isVideoOn ? "Turn off Camera" : "Turn on Camera"}
          >
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Screen Sharing Toggle */}
          <button
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-2xl flex items-center justify-center transition-all ${
              isSharingScreen
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
            }`}
            title={isSharingScreen ? "Stop Sharing Screen" : "Share Screen"}
          >
            {isSharingScreen ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
          </button>

          {/* Interactive Whiteboard Toggle */}
          <button
            onClick={toggleWhiteboard}
            className={`p-3.5 rounded-2xl flex items-center justify-center transition-all ${
              stageMode === "whiteboard"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 scale-105"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
            }`}
            title="Toggle Whiteboard"
          >
            <Palette className="w-5 h-5" />
          </button>

          {/* Participants Toggle */}
          <button
            onClick={() =>
              setActiveSideDrawer(activeSideDrawer === "participants" ? null : "participants")
            }
            className={`relative p-3.5 rounded-2xl flex items-center justify-center transition-all ${
              activeSideDrawer === "participants"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
            }`}
            title="View Participants"
          >
            <Users className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
              {participants.length}
            </span>
          </button>

          {/* Chat Toggle */}
          <button
            onClick={() => setActiveSideDrawer(activeSideDrawer === "chat" ? null : "chat")}
            className={`relative p-3.5 rounded-2xl flex items-center justify-center transition-all ${
              activeSideDrawer === "chat"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
            }`}
            title="In-Class Chat"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Device Settings */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-3.5 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors"
            title="Audio & Video Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Right Action: Leave or End Class */}
        <div className="flex items-center gap-2">
          {isHost ? (
            <button
              onClick={() => setShowEndModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all hover:scale-105"
            >
              <PhoneOff className="w-4 h-4" />
              End Class for All
            </button>
          ) : (
            <button
              onClick={handleLeaveClass}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all"
            >
              <PhoneOff className="w-4 h-4" />
              Leave Class
            </button>
          )}
        </div>
      </footer>

      {/* ─── End Class Confirmation Modal (For Host/Teacher) ────────────────── */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <PhoneOff className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">End Class for Everyone?</h3>
              <p className="text-xs text-slate-400">
                This will conclude the session, calculate total duration, and complete all student attendance records.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Keep Going
              </button>
              <button
                onClick={handleEndClassForEveryone}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                End Class
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Device Settings Modal ─────────────────────────────────────────── */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                Audio & Video Device Settings
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Microphone Input</label>
                <select
                  value={selectedMic}
                  onChange={(e) => setSelectedMic(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {audioDevices.length === 0 ? (
                    <option value="">Default System Microphone</option>
                  ) : (
                    audioDevices.map((dev) => (
                      <option key={dev.deviceId} value={dev.deviceId}>
                        {dev.label || `Microphone (${dev.deviceId.substring(0, 8)})`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Camera Input</label>
                <select
                  value={selectedCam}
                  onChange={(e) => setSelectedCam(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {videoDevices.length === 0 ? (
                    <option value="">Default System Camera</option>
                  ) : (
                    videoDevices.map((dev) => (
                      <option key={dev.deviceId} value={dev.deviceId}>
                        {dev.label || `Camera (${dev.deviceId.substring(0, 8)})`}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
