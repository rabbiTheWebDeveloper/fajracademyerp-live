"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Room,
  RoomEvent,
  ParticipantEvent,
  VideoPresets,
  Track,
  LocalTrackPublication,
  RemoteParticipant,
  RemoteTrackPublication,
  Participant,
  ConnectionState,
  ConnectionQuality,
} from "livekit-client";
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
  Loader2,
  Send,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  VolumeX,
  Radio,
  LayoutGrid,
  Palette,
  Hand,
  Crown,
  Share2,
  Check,
  UserMinus,
  Search,
  Zap,
} from "lucide-react";

// Lazy-load the heavy Whiteboard Canvas component so it doesn't block initial classroom load
const WhiteboardCanvas = dynamic(() => import("./WhiteboardCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      <span className="text-xs font-semibold">Loading interactive whiteboard...</span>
    </div>
  ),
});

interface LiveKitClassroomProps {
  classId: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  senderRole?: string;
  text: string;
  timestamp: string;
  isSelf: boolean;
}

type StageMode = "grid" | "spotlight" | "screen" | "whiteboard";

// ─── Lightweight Connection Quality Signal Bar (Pure CSS) ───────────────────
function QualityIcon({ quality }: { quality?: ConnectionQuality }) {
  if (quality === ConnectionQuality.Poor) {
    return (
      <div className="flex items-end gap-0.5 h-3 px-1" title="Poor Network Connection">
        <span className="w-1 h-1.5 bg-amber-400 rounded-xs" />
        <span className="w-1 h-2.5 bg-slate-600 rounded-xs" />
        <span className="w-1 h-3.5 bg-slate-600 rounded-xs" />
      </div>
    );
  }
  if (quality === ConnectionQuality.Lost) {
    return (
      <div className="flex items-end gap-0.5 h-3 px-1" title="Connection Lost / Reconnecting">
        <span className="w-1 h-1.5 bg-rose-500 rounded-xs animate-ping" />
        <span className="w-1 h-2.5 bg-slate-600 rounded-xs" />
        <span className="w-1 h-3.5 bg-slate-600 rounded-xs" />
      </div>
    );
  }
  // Excellent, Good or default
  return (
    <div className="flex items-end gap-0.5 h-3 px-1" title="Good Connection">
      <span className="w-1 h-1.5 bg-emerald-400 rounded-xs" />
      <span className="w-1 h-2.5 bg-emerald-400 rounded-xs" />
      <span className="w-1 h-3.5 bg-emerald-400 rounded-xs" />
    </div>
  );
}

// ─── Participant Video Tile (Memoized to prevent cascading re-renders) ───────
const ParticipantTile = React.memo(
  function ParticipantTile({
    participant,
    isLocal = false,
    isSpotlight = false,
    onSpotlight,
    dataSaver = false,
  }: {
    participant: Participant;
    isLocal?: boolean;
    isSpotlight?: boolean;
    onSpotlight?: () => void;
    dataSaver?: boolean;
  }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [videoTrack, setVideoTrack] = useState<Track | null>(null);
    const [audioTrack, setAudioTrack] = useState<Track | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(participant.isSpeaking);
    const [isMuted, setIsMuted] = useState(!participant.isMicrophoneEnabled);
    const [isVideoEnabled, setIsVideoEnabled] = useState(participant.isCameraEnabled);
    const [quality, setQuality] = useState<ConnectionQuality>(participant.connectionQuality);

    // Sync track subscriptions & participant events
    useEffect(() => {
      let mounted = true;

      const updateTracks = () => {
        if (!mounted) return;
        try {
          const cameraPub = participant.getTrackPublication(Track.Source.Camera);
          setVideoTrack(cameraPub?.track || null);
          setIsVideoEnabled(Boolean(cameraPub && !cameraPub.isMuted && cameraPub.track));

          const micPub = participant.getTrackPublication(Track.Source.Microphone);
          setAudioTrack(micPub?.track || null);
          setIsMuted(Boolean(!micPub || micPub.isMuted));
        } catch (err) {
          console.warn("ParticipantTile track sync notice:", err);
        }
      };

      updateTracks();

      const handleTrackSubscribed = () => updateTracks();
      const handleTrackUnsubscribed = () => updateTracks();
      const handleMuted = () => updateTracks();
      const handleUnmuted = () => updateTracks();
      const handleSpeakingChanged = (speaking: boolean) => {
        if (mounted) setIsSpeaking(speaking);
      };
      const handleQualityChanged = (q: ConnectionQuality) => {
        if (mounted) setQuality(q);
      };

      participant.on(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);
      participant.on(ParticipantEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      participant.on(ParticipantEvent.TrackMuted, handleMuted);
      participant.on(ParticipantEvent.TrackUnmuted, handleUnmuted);
      participant.on(ParticipantEvent.IsSpeakingChanged, handleSpeakingChanged);
      participant.on(ParticipantEvent.ConnectionQualityChanged, handleQualityChanged);

      return () => {
        mounted = false;
        participant.off(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);
        participant.off(ParticipantEvent.TrackUnsubscribed, handleTrackUnsubscribed);
        participant.off(ParticipantEvent.TrackMuted, handleMuted);
        participant.off(ParticipantEvent.TrackUnmuted, handleUnmuted);
        participant.off(ParticipantEvent.IsSpeakingChanged, handleSpeakingChanged);
        participant.off(ParticipantEvent.ConnectionQualityChanged, handleQualityChanged);
      };
    }, [participant]);

    // Data Saver: pause video stream on remote participant to prioritize audio
    useEffect(() => {
      if (isLocal) return;
      try {
        const cameraPub = participant.getTrackPublication(Track.Source.Camera) as RemoteTrackPublication | undefined;
        if (cameraPub) {
          cameraPub.setSubscribed(!dataSaver);
        }
      } catch (_) {}
    }, [dataSaver, isLocal, participant]);

    // Attach video track to DOM element safely
    useEffect(() => {
      const el = videoRef.current;
      if (!el || !videoTrack || (dataSaver && !isLocal)) {
        if (el && videoTrack) {
          try { videoTrack.detach(el); } catch (_) {}
        }
        return;
      }

      try {
        videoTrack.attach(el);
      } catch (e) {
        console.warn("videoTrack attach notice:", e);
      }

      return () => {
        try {
          videoTrack.detach(el);
        } catch (_) {}
      };
    }, [videoTrack, dataSaver, isLocal]);

    // Attach audio track for remote participants (avoid local echo)
    useEffect(() => {
      if (isLocal) return;
      const el = audioRef.current;
      if (!el || !audioTrack) return;

      try {
        audioTrack.attach(el);
      } catch (e) {
        console.warn("audioTrack attach notice:", e);
      }

      return () => {
        try {
          audioTrack.detach(el);
        } catch (_) {}
      };
    }, [audioTrack, isLocal]);

    // Metadata parsing
    const metadata = useMemo(() => {
      try {
        return participant.metadata ? JSON.parse(participant.metadata) : {};
      } catch {
        return {};
      }
    }, [participant.metadata]);

    const isTeacher = metadata.userRole === "teacher" || metadata.isHost || participant.identity.startsWith("teacher_");
    const displayName = participant.name || (isTeacher ? "Teacher" : "Student");
    const shouldShowVideo = isVideoEnabled && (!dataSaver || isLocal);

    return (
      <div
        onClick={onSpotlight}
        className={`relative bg-slate-900/90 rounded-2xl overflow-hidden border transition-all flex items-center justify-center cursor-pointer group ${
          isSpeaking
            ? "border-emerald-500 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/50"
            : isSpotlight
            ? "border-blue-500/80 shadow-lg shadow-blue-500/20"
            : "border-slate-800 hover:border-slate-700"
        } w-full h-full min-h-[160px]`}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${shouldShowVideo ? "opacity-100" : "opacity-0 pointer-events-none"} ${
            isLocal ? "transform -scale-x-100" : ""
          }`}
        />

        {/* Remote Audio Element */}
        {!isLocal && <audio ref={audioRef} autoPlay />}

        {/* Video Off / Data Saver Fallback Avatar */}
        {!shouldShowVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-950">
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-lg sm:text-xl font-bold text-white shadow-xl ${
                isTeacher
                  ? "bg-gradient-to-br from-blue-600 to-indigo-700 ring-4 ring-blue-500/30"
                  : "bg-gradient-to-br from-teal-600 to-emerald-700 ring-4 ring-emerald-500/30"
              }`}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="mt-2.5 text-xs sm:text-sm font-semibold text-slate-200 truncate max-w-[80%]">
              {displayName} {isLocal && "(You)"}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              {dataSaver && !isLocal ? "Audio Only (Data Saver)" : "Camera is off"}
            </span>
          </div>
        )}

        {/* Participant Badge & Status */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 text-xs font-medium text-white shadow-md">
            {isTeacher ? (
              <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            ) : (
              <Shield className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
            )}
            <span className="truncate max-w-[110px] sm:max-w-[150px] font-semibold text-[11px] sm:text-xs">
              {displayName} {isLocal && "(You)"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Signal Quality Meter */}
            <div className="p-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 flex items-center">
              <QualityIcon quality={quality} />
            </div>

            {/* Microphone Indicator */}
            <div
              className={`p-1.5 rounded-lg backdrop-blur-md border ${
                isMuted
                  ? "bg-rose-950/80 border-rose-500/40 text-rose-400"
                  : isSpeaking
                  ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-400 animate-pulse"
                  : "bg-slate-950/80 border-white/10 text-slate-300"
              }`}
            >
              {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.participant.sid === next.participant.sid &&
      prev.isLocal === next.isLocal &&
      prev.isSpotlight === next.isSpotlight &&
      prev.dataSaver === next.dataSaver
    );
  }
);

// ─── Main Classroom Container ────────────────────────────────────────────────
export default function LiveKitClassroomContainer({ classId }: LiveKitClassroomProps) {
  const router = useRouter();

  // Connection & Room States
  const [connecting, setConnecting] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showReconnectedPill, setShowReconnectedPill] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [room, setRoom] = useState<Room | null>(null);

  // Classroom Media Controls
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [screenTrack, setScreenTrack] = useState<Track | null>(null);
  const [screenSharerName, setScreenSharerName] = useState<string>("");
  const [isDataSaver, setIsDataSaver] = useState(false);

  // Stage & View Modes
  const [stageMode, setStageMode] = useState<StageMode>("grid");
  const [spotlightParticipantId, setSpotlightParticipantId] = useState<string | null>(null);
  const [isWhiteboardActive, setIsWhiteboardActive] = useState(false);
  const [incomingWhiteboardCmd, setIncomingWhiteboardCmd] = useState<any>(null);

  // UI Panels
  const [activeSideDrawer, setActiveSideDrawer] = useState<"participants" | "chat" | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [handRaisedUsers, setHandRaisedUsers] = useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = useState(false);

  // Device Selection States
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");

  // Participants & Chat
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");

  // Elapsed Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Refs
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Timer interval
  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [connectionState]);

  // Scroll chat on new messages
  useEffect(() => {
    if (activeSideDrawer === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeSideDrawer]);

  // ─── Connect to LiveKit Room ────────────────────────────────────────────────
  useEffect(() => {
    let currentRoom: Room | null = null;
    let isSubscribed = true;

    const connectToLiveKit = async () => {
      setConnecting(true);
      setError(null);

      try {
        // Step 1: Request LiveKit token from server
        const tokenRes = await fetch(`/api/online-classes/${classId}/livekit-token`, {
          method: "POST",
        });
        const tokenData = await tokenRes.json();

        if (!tokenData.success) {
          throw new Error(tokenData.message || "Failed to authenticate into LiveKit room");
        }

        if (!isSubscribed) return;
        setSessionInfo(tokenData);

        // Step 2: Record attendance join
        try {
          await fetch(`/api/online-classes/${classId}/join`, {
            method: "POST",
          });
        } catch (attErr) {
          console.warn("Attendance join record warning:", attErr);
        }

        if (!isSubscribed) return;

        // Step 3: Initialize LiveKit Room client with Adaptive Stream & Dynacast
        const roomInstance = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: VideoPresets.h540.resolution,
          },
          publishDefaults: {
            simulcast: true,
            videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
            screenShareSimulcastLayers: [VideoPresets.h720],
            stopMicTrackOnMute: false,
            videoCodec: "vp8",
          },
          audioCaptureDefaults: {
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        currentRoom = roomInstance;

        // Room Event Listeners
        roomInstance.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          if (!isSubscribed) return;
          setConnectionState(state);
        });

        roomInstance.on(RoomEvent.Reconnecting, () => {
          if (!isSubscribed) return;
          setIsReconnecting(true);
        });

        roomInstance.on(RoomEvent.Reconnected, () => {
          if (!isSubscribed) return;
          setIsReconnecting(false);
          setShowReconnectedPill(true);
          setTimeout(() => setShowReconnectedPill(false), 3500);
        });

        roomInstance.on(RoomEvent.Disconnected, () => {
          if (!isSubscribed) return;
          setConnectionState(ConnectionState.Disconnected);
          setIsSharingScreen(false);
          setScreenTrack(null);
        });

        roomInstance.on(RoomEvent.MediaDevicesError, (e: Error) => {
          console.warn("LiveKit MediaDevicesError notice:", e);
        });

        // Track Subscribed (Remote participant started sharing video/audio/screen)
        roomInstance.on(RoomEvent.TrackSubscribed, (track: Track, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
          if (track.source === Track.Source.ScreenShare) {
            setScreenTrack(track);
            setScreenSharerName(participant.name || "Participant");
            setStageMode("screen");
          }
          if (isSubscribed) {
            setRemoteParticipants(Array.from(roomInstance.remoteParticipants.values()));
          }
        });

        // Track Unsubscribed
        roomInstance.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
          if (track.source === Track.Source.ScreenShare) {
            setScreenTrack(null);
            setScreenSharerName("");
            setStageMode("grid");
          }
          if (isSubscribed) {
            setRemoteParticipants(Array.from(roomInstance.remoteParticipants.values()));
          }
        });

        // Local Track Published (Local screen share or camera)
        roomInstance.on(RoomEvent.LocalTrackPublished, (pub: LocalTrackPublication) => {
          if (pub.source === Track.Source.ScreenShare && pub.track) {
            setScreenTrack(pub.track);
            setScreenSharerName(tokenData?.userName || "You");
            setIsSharingScreen(true);
            setStageMode("screen");

            if (pub.track.mediaStreamTrack) {
              pub.track.mediaStreamTrack.onended = () => {
                if (roomInstance.state === ConnectionState.Connected) {
                  roomInstance.localParticipant.setScreenShareEnabled(false).catch(() => {});
                }
                setIsSharingScreen(false);
                setScreenTrack(null);
                setScreenSharerName("");
                setStageMode("grid");
              };
            }
          }
        });

        // Local Track Unpublished
        roomInstance.on(RoomEvent.LocalTrackUnpublished, (pub: LocalTrackPublication) => {
          if (pub.source === Track.Source.ScreenShare) {
            setIsSharingScreen(false);
            setScreenTrack(null);
            setScreenSharerName("");
            setStageMode("grid");
          }
        });

        // Participant Joined
        roomInstance.on(RoomEvent.ParticipantConnected, () => {
          if (isSubscribed) {
            setRemoteParticipants(Array.from(roomInstance.remoteParticipants.values()));
          }
        });

        // Participant Left
        roomInstance.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          if (isSubscribed) {
            setRemoteParticipants(Array.from(roomInstance.remoteParticipants.values()));
            setHandRaisedUsers((prev) => {
              const next = new Set(prev);
              next.delete(participant.identity);
              return next;
            });
          }
        });

        // Handle Custom Data Messages (Chat, Whiteboard, Raise Hand, Host Controls)
        roomInstance.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
          try {
            const str = new TextDecoder().decode(payload);
            const data = JSON.parse(str);

            if (data.type === "chat") {
              const newMsg: ChatMessage = {
                id: data.id || `msg_${Date.now()}_${Math.random()}`,
                sender: data.sender || participant?.name || "Participant",
                senderRole: data.senderRole,
                text: data.text || "",
                timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                isSelf: false,
              };
              setChatMessages((prev) => [...prev, newMsg]);
              setActiveSideDrawer((drawer) => {
                if (drawer !== "chat") {
                  setUnreadChatCount((c) => c + 1);
                }
                return drawer;
              });
            } else if (data.type === "whiteboard") {
              setIncomingWhiteboardCmd({
                action: data.action,
                payload: data.payload,
                timestamp: Date.now(),
              });
              if (data.action === "open") {
                setIsWhiteboardActive(true);
                setStageMode("whiteboard");
              } else if (data.action === "close") {
                setIsWhiteboardActive(false);
                setStageMode("grid");
              }
            } else if (data.type === "hand_raise") {
              const identity = participant?.identity || data.identity;
              if (identity) {
                setHandRaisedUsers((prev) => {
                  const next = new Set(prev);
                  if (data.raised) {
                    next.add(identity);
                  } else {
                    next.delete(identity);
                  }
                  return next;
                });
              }
            } else if (data.type === "remote_mute") {
              if (data.targetIdentity === roomInstance.localParticipant.identity) {
                if (roomInstance.state === ConnectionState.Connected) {
                  roomInstance.localParticipant.setMicrophoneEnabled(false).catch(() => {});
                }
                setIsAudioMuted(true);
              }
            } else if (data.type === "remote_stop_video") {
              if (data.targetIdentity === roomInstance.localParticipant.identity) {
                if (roomInstance.state === ConnectionState.Connected) {
                  roomInstance.localParticipant.setCameraEnabled(false).catch(() => {});
                }
                setIsVideoOn(false);
              }
            } else if (data.type === "mute_all") {
              if (!tokenData?.isHost) {
                if (roomInstance.state === ConnectionState.Connected) {
                  roomInstance.localParticipant.setMicrophoneEnabled(false).catch(() => {});
                }
                setIsAudioMuted(true);
              }
            } else if (data.type === "lower_hand") {
              if (data.targetIdentity === roomInstance.localParticipant.identity) {
                setHandRaised(false);
              }
              setHandRaisedUsers((prev) => {
                const next = new Set(prev);
                next.delete(data.targetIdentity);
                return next;
              });
            } else if (data.type === "kick_participant") {
              if (data.targetIdentity === roomInstance.localParticipant.identity) {
                alert("You have been removed from this online class by the host.");
                if (currentRoom && currentRoom.state !== ConnectionState.Disconnected) {
                  currentRoom.disconnect().catch(() => {});
                }
                router.push("/online-classes");
              }
            } else if (data.type === "end_class_signal") {
              alert("The teacher has concluded this online class session.");
              router.push("/online-classes");
            }
          } catch (e) {
            console.warn("Failed to parse LiveKit data packet:", e);
          }
        });

        // Step 4: Connect to LiveKit Cloud Server
        const serverUrl = tokenData.serverUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://huuihhuoiu-dud747ko.livekit.cloud";
        await roomInstance.connect(serverUrl, tokenData.token, {
          autoSubscribe: true,
        });

        if (!isSubscribed || roomInstance.state !== ConnectionState.Connected) {
          if (roomInstance.state !== ConnectionState.Disconnected) {
            roomInstance.disconnect().catch(() => {});
          }
          return;
        }

        // Enable Camera and Microphone gracefully & independently
        try {
          if (roomInstance.state === ConnectionState.Connected) {
            try {
              await roomInstance.localParticipant.setMicrophoneEnabled(true);
              setIsAudioMuted(false);
            } catch (micErr) {
              console.warn("Microphone access notice:", micErr);
              setIsAudioMuted(true);
            }

            try {
              await roomInstance.localParticipant.setCameraEnabled(true);
              setIsVideoOn(true);
            } catch (camErr) {
              console.warn("Camera access notice:", camErr);
              setIsVideoOn(false);
            }
          }
        } catch (mediaErr) {
          console.warn("Camera/Mic initial setup notice:", mediaErr);
        }

        // Query available devices for settings
        try {
          const audioInputs = await Room.getLocalDevices("audioinput");
          const videoInputs = await Room.getLocalDevices("videoinput");
          setAudioInputDevices(audioInputs);
          setVideoInputDevices(videoInputs);
        } catch (_) {}

        if (isSubscribed) {
          setRoom(roomInstance);
          setRemoteParticipants(Array.from(roomInstance.remoteParticipants.values()));
          setConnecting(false);
        }
      } catch (err: any) {
        console.error("LiveKit connection error:", err);
        if (isSubscribed) {
          setError(err.message || "Unable to connect to LiveKit video server.");
          setConnecting(false);
        }
      }
    };

    connectToLiveKit();

    return () => {
      isSubscribed = false;
      if (currentRoom) {
        try {
          // Stop all local media tracks to ensure camera/mic hardware LEDs turn off immediately
          currentRoom.localParticipant?.trackPublications.forEach((pub) => {
            if (pub.track) {
              pub.track.stop();
            }
          });
          if (currentRoom.state !== ConnectionState.Disconnected) {
            currentRoom.disconnect().catch(() => {});
          }
        } catch (_) {}
      }
      // Record attendance leave via beacon if possible or fetch
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(`/api/online-classes/${classId}/leave`);
        } else {
          fetch(`/api/online-classes/${classId}/leave`, { method: "POST" }).catch(() => {});
        }
      } catch (_) {}
    };
  }, [classId, router]);

  // Attach Remote Screen Share Video
  useEffect(() => {
    const el = screenVideoRef.current;
    if (!el || !screenTrack) return;

    try {
      screenTrack.attach(el);
    } catch (e) {
      console.warn("screenTrack attach notice:", e);
    }

    return () => {
      try {
        screenTrack.detach(el);
      } catch (_) {}
    };
  }, [screenTrack]);

  // ─── Media Controls ────────────────────────────────────────────────────────
  const toggleMicrophone = async () => {
    if (!room || room.state !== ConnectionState.Connected) return;
    try {
      const nextState = !isAudioMuted;
      await room.localParticipant.setMicrophoneEnabled(!nextState);
      setIsAudioMuted(nextState);
    } catch (err) {
      console.warn("Failed to toggle microphone:", err);
    }
  };

  const toggleCamera = async () => {
    if (!room || room.state !== ConnectionState.Connected) return;
    try {
      const nextState = !isVideoOn;
      await room.localParticipant.setCameraEnabled(nextState);
      setIsVideoOn(nextState);
    } catch (err) {
      console.warn("Failed to toggle camera:", err);
    }
  };

  const toggleScreenShare = async () => {
    if (!room || room.state !== ConnectionState.Connected) return;
    try {
      if (isSharingScreen) {
        await room.localParticipant.setScreenShareEnabled(false);
        setIsSharingScreen(false);
        setScreenTrack(null);
        setScreenSharerName("");
        setStageMode("grid");
      } else {
        // Optimized screen share settings: text detail priority with low framerate to save bandwidth
        await room.localParticipant.setScreenShareEnabled(true, {
          audio: true,
          resolution: VideoPresets.h1080.resolution,
          contentHint: "detail",
        });

        const screenPub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
        if (screenPub?.track) {
          setScreenTrack(screenPub.track);
          setScreenSharerName(sessionInfo?.userName || "You");
          setIsSharingScreen(true);
          setStageMode("screen");

          if (screenPub.track.mediaStreamTrack) {
            screenPub.track.mediaStreamTrack.onended = () => {
              if (room.state === ConnectionState.Connected) {
                room.localParticipant.setScreenShareEnabled(false).catch(() => {});
              }
              setIsSharingScreen(false);
              setScreenTrack(null);
              setScreenSharerName("");
              setStageMode("grid");
            };
          }
        }
      }
    } catch (err: any) {
      console.warn("Failed to toggle screen share:", err);
      setIsSharingScreen(false);
      setScreenTrack(null);
      setScreenSharerName("");
      setStageMode("grid");
    }
  };

  // ─── Data Saver (Low Bandwidth Mode) ───────────────────────────────────────
  const toggleDataSaver = () => {
    setIsDataSaver((prev) => {
      const next = !prev;
      if (room && room.state === ConnectionState.Connected) {
        room.remoteParticipants.forEach((p) => {
          p.videoTrackPublications.forEach((pub) => {
            if (pub.source === Track.Source.Camera) {
              pub.setSubscribed(!next);
            }
          });
        });
      }
      return next;
    });
  };

  // ─── Host Meeting Management Controls ───────────────────────────────────────
  const handleMuteAll = async () => {
    if (!room || room.state !== ConnectionState.Connected || !isHost) return;
    try {
      const payload = JSON.stringify({ type: "mute_all", fromHost: true });
      await room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
    } catch (e) {
      console.warn("handleMuteAll notice:", e);
    }
  };

  const handleRemoteMuteParticipant = async (identity: string) => {
    if (!room || room.state !== ConnectionState.Connected || !isHost) return;
    try {
      const payload = JSON.stringify({ type: "remote_mute", targetIdentity: identity });
      await room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
    } catch (e) {
      console.warn("handleRemoteMuteParticipant notice:", e);
    }
  };

  const handleRemoteStopVideo = async (identity: string) => {
    if (!room || room.state !== ConnectionState.Connected || !isHost) return;
    try {
      const payload = JSON.stringify({ type: "remote_stop_video", targetIdentity: identity });
      await room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
    } catch (e) {
      console.warn("handleRemoteStopVideo notice:", e);
    }
  };

  const handleLowerParticipantHand = async (identity: string) => {
    if (!room || room.state !== ConnectionState.Connected || !isHost) return;
    try {
      setHandRaisedUsers((prev) => {
        const next = new Set(prev);
        next.delete(identity);
        return next;
      });
      const payload = JSON.stringify({ type: "lower_hand", targetIdentity: identity });
      await room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
    } catch (e) {
      console.warn("handleLowerParticipantHand notice:", e);
    }
  };

  const handleKickParticipant = async (identity: string, name?: string) => {
    if (!room || room.state !== ConnectionState.Connected || !isHost) return;
    if (!confirm(`Are you sure you want to remove ${name || "this student"} from the class?`)) return;
    try {
      const payload = JSON.stringify({ type: "kick_participant", targetIdentity: identity });
      await room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
    } catch (e) {
      console.warn("handleKickParticipant notice:", e);
    }
  };

  const toggleHandRaise = async () => {
    if (!room || room.state !== ConnectionState.Connected) return;
    try {
      const nextState = !handRaised;
      setHandRaised(nextState);

      const payload = JSON.stringify({
        type: "hand_raise",
        identity: room.localParticipant.identity,
        name: sessionInfo?.userName || "Student",
        raised: nextState,
      });
      await room.localParticipant.publishData(new TextEncoder().encode(payload), {
        reliable: true,
      });
    } catch (e) {
      console.warn("toggleHandRaise notice:", e);
    }
  };

  // ─── Whiteboard Integration ─────────────────────────────────────────────────
  const toggleWhiteboard = async () => {
    const nextState = !isWhiteboardActive;
    setIsWhiteboardActive(nextState);
    setStageMode(nextState ? "whiteboard" : "grid");

    if (room && room.state === ConnectionState.Connected) {
      try {
        const payload = JSON.stringify({
          type: "whiteboard",
          action: nextState ? "open" : "close",
        });
        await room.localParticipant.publishData(new TextEncoder().encode(payload), {
          reliable: true,
        });
      } catch (e) {
        console.warn("toggleWhiteboard notice:", e);
      }
    }
  };

  const handleSendWhiteboardCommand = async (action: string, payloadData: any) => {
    if (!room || room.state !== ConnectionState.Connected) return;
    try {
      const payload = JSON.stringify({
        type: "whiteboard",
        action,
        payload: payloadData,
      });
      await room.localParticipant.publishData(new TextEncoder().encode(payload), {
        reliable: true,
      });
    } catch (e) {
      console.warn("handleSendWhiteboardCommand notice:", e);
    }
  };

  // ─── Chat Message Broadcast ────────────────────────────────────────────────
  const sendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !room || room.state !== ConnectionState.Connected) return;

    const messageText = chatInput.trim();
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      sender: sessionInfo?.userName || (sessionInfo?.isHost ? "Teacher" : "Student"),
      senderRole: sessionInfo?.userRole || (sessionInfo?.isHost ? "teacher" : "student"),
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isSelf: true,
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");

    // Publish to all participants in the room
    try {
      const packet = JSON.stringify({
        type: "chat",
        ...newMsg,
        isSelf: false,
      });
      await room.localParticipant.publishData(new TextEncoder().encode(packet), {
        reliable: true,
      });
    } catch (err) {
      console.warn("Failed to broadcast chat message:", err);
    }
  };

  // ─── Device Switching ──────────────────────────────────────────────────────
  const handleDeviceChange = async (kind: "audioinput" | "videoinput", deviceId: string) => {
    if (!room) return;
    try {
      await room.switchActiveDevice(kind, deviceId);
      if (kind === "audioinput") setSelectedAudioDevice(deviceId);
      if (kind === "videoinput") setSelectedVideoDevice(deviceId);
    } catch (err) {
      console.warn(`Failed to switch ${kind} device:`, err);
    }
  };

  // ─── Leave & End Class ─────────────────────────────────────────────────────
  const handleLeaveClass = async () => {
    if (room && room.state === ConnectionState.Connected) {
      try {
        await room.disconnect();
      } catch (e) {
        console.warn("Leave room disconnect notice:", e);
      }
    }
    router.push("/online-classes");
  };

  const handleEndClassForEveryone = async () => {
    try {
      if (room && room.state === ConnectionState.Connected) {
        try {
          const packet = JSON.stringify({ type: "end_class_signal" });
          await room.localParticipant.publishData(new TextEncoder().encode(packet), { reliable: true });
        } catch (_) {}
        try {
          await room.disconnect();
        } catch (_) {}
      }
      await fetch(`/api/online-classes/${classId}/end`, { method: "POST" });
      router.push("/teacher/online-classes-liveKit");
    } catch (err) {
      console.error("Failed to end class:", err);
      router.push("/teacher/online-classes-liveKit");
    }
  };

  const copyRoomUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Format Elapsed Time: MM:SS or HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Loading & Error States
  // ───────────────────────────────────────────────────────────────────────────
  if (connecting) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center animate-pulse">
            <Radio className="w-10 h-10 text-blue-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-100">Connecting to Fajr Academy LiveKit</h2>
        <p className="text-sm text-slate-400 mt-1 max-w-md">
          Establishing ultra-low-latency WebRTC media stream with LiveKit Cloud server...
        </p>

        <div className="mt-8 flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          <span>Low-Latency Adaptive Streaming</span>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Classroom Connection Failed</h2>
        <p className="text-sm text-slate-400 mt-2 max-w-md">{error || "Could not establish LiveKit session."}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-sm text-white transition-all cursor-pointer"
          >
            Retry Connection
          </button>
          <Link
            href="/teacher/online-classes-liveKit"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-sm text-slate-300 transition-all"
          >
            Exit to Classes
          </Link>
        </div>
      </div>
    );
  }

  const allParticipants = [room.localParticipant, ...remoteParticipants];
  const isHost = sessionInfo?.isHost || false;

  // ───────────────────────────────────────────────────────────────────────────
  // Live Classroom UI
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden text-slate-100 font-sans select-none relative">
      {/* ── Reconnecting / Network Warning Floating Banners ── */}
      {isReconnecting && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
          <span>Unstable network. Reconnecting to classroom (Audio prioritized)...</span>
        </div>
      )}

      {showReconnectedPill && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>Reconnected! Media stream restored.</span>
        </div>
      )}

      {/* ── Top Navigation Bar ── */}
      <header className="h-16 px-4 sm:px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between flex-shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-[180px] sm:max-w-md">
                {sessionInfo?.classTitle || "Live Online Class"}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
              <span>Room: {room.name}</span>
              <span>•</span>
              <span className="text-blue-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {formatTime(elapsedSeconds)}
              </span>
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          {/* Share room button */}
          <button
            onClick={copyRoomUrl}
            title="Copy Classroom Invite Link"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700/60 transition-all cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline">{copiedLink ? "Copied!" : "Share Link"}</span>
          </button>

          {/* View mode buttons */}
          <div className="hidden md:flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
            <button
              onClick={() => {
                setStageMode("grid");
                setIsWhiteboardActive(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                stageMode === "grid" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grid
            </button>
            <button
              onClick={toggleWhiteboard}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                isWhiteboardActive ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              <Palette className="w-3.5 h-3.5" /> Board
            </button>
          </div>

          {/* Fullscreen */}
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                setIsFullscreen(true);
              } else {
                document.exitFullscreen();
                setIsFullscreen(false);
              }
            }}
            title="Toggle Fullscreen"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── Main Stage Area + Side Drawer ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Stage Content */}
        <main className="flex-1 p-3 sm:p-4 overflow-y-auto flex flex-col justify-center items-center">
          {/* 1. Whiteboard Mode */}
          {isWhiteboardActive ? (
            <div className="w-full h-full max-w-6xl max-h-[85vh] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
              <WhiteboardCanvas
                isHost={isHost}
                onSendCommand={handleSendWhiteboardCommand}
                incomingCommand={incomingWhiteboardCmd}
                onClose={() => {
                  setIsWhiteboardActive(false);
                  setStageMode("grid");
                }}
              />
            </div>
          ) : screenTrack ? (
            /* 2. Screen Share Spotlight Mode */
            <div className="w-full h-full flex flex-col items-center justify-center relative">
              <div className="w-full h-full max-h-[82vh] bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative flex items-center justify-center">
                <video ref={screenVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
                <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold text-white flex items-center gap-2">
                  <MonitorUp className="w-4 h-4 text-blue-400 animate-pulse" />
                  <span>{screenSharerName || "Participant"}'s Screen</span>
                </div>
                {isSharingScreen && (
                  <button
                    onClick={toggleScreenShare}
                    className="absolute top-4 right-4 bg-rose-600/90 hover:bg-rose-600 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-rose-400/40 text-xs font-bold text-white flex items-center gap-2 shadow-lg cursor-pointer transition-all"
                  >
                    <MonitorOff className="w-4 h-4" /> Stop Sharing
                  </button>
                )}
              </div>

              {/* Mini participant strip below screen share */}
              <div className="w-full flex items-center justify-center gap-3 overflow-x-auto py-2 px-1 max-w-4xl">
                {allParticipants.map((p) => (
                  <div key={p.identity} className="w-36 h-24 flex-shrink-0">
                    <ParticipantTile
                      participant={p}
                      isLocal={p === room.localParticipant}
                      dataSaver={isDataSaver}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 3. Grid Mode (1 to N participants responsive layout) */
            <div
              className={`w-full h-full max-h-[85vh] grid gap-3 sm:gap-4 ${
                allParticipants.length === 1
                  ? "grid-cols-1 max-w-3xl"
                  : allParticipants.length === 2
                  ? "grid-cols-1 sm:grid-cols-2 max-w-5xl"
                  : allParticipants.length <= 4
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 max-w-5xl"
                  : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 max-w-6xl"
              }`}
            >
              {allParticipants.map((p) => (
                <ParticipantTile
                  key={p.identity}
                  participant={p}
                  isLocal={p === room.localParticipant}
                  isSpotlight={spotlightParticipantId === p.identity}
                  dataSaver={isDataSaver}
                  onSpotlight={() =>
                    setSpotlightParticipantId((curr) => (curr === p.identity ? null : p.identity))
                  }
                />
              ))}
            </div>
          )}
        </main>

        {/* ── Side Drawer (Chat / Participants) ── */}
        {activeSideDrawer && (
          <aside className="w-full sm:w-80 md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col z-20 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activeSideDrawer === "chat" ? (
                  <>
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">Live Classroom Chat</h3>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 text-teal-400" />
                    <h3 className="text-sm font-bold text-white">
                      Participants ({allParticipants.length})
                    </h3>
                  </>
                )}
              </div>
              <button
                onClick={() => setActiveSideDrawer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            {activeSideDrawer === "chat" ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Message List */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
                      <MessageSquare className="w-8 h-8 mb-2 opacity-40 text-blue-400" />
                      <p className="font-semibold text-slate-400">No messages yet</p>
                      <p className="text-[11px] mt-1">Send a message to everyone in this class session.</p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                          <span className="font-bold text-slate-300">{msg.sender}</span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <div
                          className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs ${
                            msg.isSelf
                              ? "bg-blue-600 text-white rounded-br-xs shadow-md shadow-blue-600/20"
                              : "bg-slate-800 text-slate-200 rounded-bl-xs border border-slate-700/60"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={sendChatMessage} className="p-3 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs transition-all flex items-center justify-center cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            ) : (
              /* Participant List */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Host Control Actions & Search */}
                <div className="p-3 border-b border-slate-800/80 space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search participant..."
                      value={participantSearch}
                      onChange={(e) => setParticipantSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {isHost && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleMuteAll}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        <VolumeX className="w-3.5 h-3.5" />
                        Mute All Students
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 p-3 overflow-y-auto space-y-2">
                  {allParticipants
                    .filter((p) => {
                      if (!participantSearch.trim()) return true;
                      const q = participantSearch.toLowerCase();
                      return (p.name || "Participant").toLowerCase().includes(q);
                    })
                    .map((p) => {
                      const isLocal = p === room.localParticipant;
                      let meta: any = {};
                      try {
                        if (p.metadata) meta = JSON.parse(p.metadata);
                      } catch (_) {}
                      const isPTeacher = meta.userRole === "teacher" || meta.isHost || p.identity.startsWith("teacher_");
                      const hasHand = handRaisedUsers.has(p.identity);

                      return (
                        <div
                          key={p.identity}
                          className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white flex-shrink-0 ${
                                  isPTeacher ? "bg-blue-600" : "bg-teal-600"
                                }`}
                              >
                                {(p.name || "U").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-200 truncate">
                                  {p.name || "Participant"} {isLocal && "(You)"}
                                </p>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  {isPTeacher ? "Teacher (Host)" : "Student"}
                                  {hasHand && (
                                    <span className="text-amber-400 font-bold flex items-center gap-0.5">
                                      • <Hand className="w-2.5 h-2.5" /> Hand Raised
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 text-slate-400 flex-shrink-0">
                              {p.isMicrophoneEnabled ? (
                                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <MicOff className="w-3.5 h-3.5 text-rose-400" />
                              )}
                              {p.isCameraEnabled ? (
                                <Video className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <VideoOff className="w-3.5 h-3.5 text-slate-500" />
                              )}
                            </div>
                          </div>

                          {/* Host Management Controls for other participants */}
                          {isHost && !isLocal && (
                            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-1 text-[11px]">
                              <button
                                onClick={() => handleRemoteMuteParticipant(p.identity)}
                                title="Mute Participant Microphone"
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <MicOff className="w-3 h-3 text-rose-400" /> Mute
                              </button>

                              <button
                                onClick={() => handleRemoteStopVideo(p.identity)}
                                title="Disable Participant Camera"
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <VideoOff className="w-3 h-3 text-amber-400" /> Stop Cam
                              </button>

                              {hasHand && (
                                <button
                                  onClick={() => handleLowerParticipantHand(p.identity)}
                                  title="Lower Raised Hand"
                                  className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  Lower Hand
                                </button>
                              )}

                              <button
                                onClick={() => handleKickParticipant(p.identity, p.name)}
                                title="Remove / Kick from Class"
                                className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <UserMinus className="w-3 h-3" /> Remove
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ── Bottom Control Toolbar ── */}
      <footer className="h-20 px-3 sm:px-8 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 flex items-center justify-between flex-shrink-0 z-30">
        {/* Left indicators */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>WebRTC Low-Latency</span>
          </div>
        </div>

        {/* Center Main Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 mx-auto md:mx-0 overflow-x-auto py-1">
          {/* Microphone Toggle */}
          <button
            onClick={toggleMicrophone}
            title={isAudioMuted ? "Unmute Microphone" : "Mute Microphone"}
            className={`p-2.5 sm:px-4 sm:py-3 rounded-2xl flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
              isAudioMuted
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80"
            }`}
          >
            {isAudioMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />}
            <span className="hidden sm:inline">{isAudioMuted ? "Unmute" : "Mute"}</span>
          </button>

          {/* Camera Toggle */}
          <button
            onClick={toggleCamera}
            title={isVideoOn ? "Turn off camera" : "Turn on camera"}
            className={`p-2.5 sm:px-4 sm:py-3 rounded-2xl flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
              !isVideoOn
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80"
            }`}
          >
            {isVideoOn ? <Video className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" /> : <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />}
            <span className="hidden sm:inline">{isVideoOn ? "Stop Video" : "Start Video"}</span>
          </button>

          {/* Screen Share Toggle */}
          <button
            onClick={toggleScreenShare}
            title={isSharingScreen ? "Stop screen sharing" : "Share your screen"}
            className={`p-2.5 sm:px-4 sm:py-3 rounded-2xl flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
              isSharingScreen
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80"
            }`}
          >
            {isSharingScreen ? <MonitorOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <MonitorUp className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400" />}
            <span className="hidden sm:inline">{isSharingScreen ? "Stop Share" : "Share Screen"}</span>
          </button>

          {/* Interactive Whiteboard */}
          <button
            onClick={toggleWhiteboard}
            title="Interactive Whiteboard"
            className={`p-2.5 sm:px-4 sm:py-3 rounded-2xl flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
              isWhiteboardActive
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80"
            }`}
          >
            <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
            <span className="hidden sm:inline">Whiteboard</span>
          </button>

          {/* Data Saver Mode (Low-Bandwidth / Audio-First) */}
          <button
            onClick={toggleDataSaver}
            title={isDataSaver ? "Disable Data Saver (Receive Video)" : "Enable Data Saver (Audio-First Mode for Slow Internet)"}
            className={`p-2.5 sm:px-3 sm:py-3 rounded-2xl flex items-center gap-1.5 font-bold text-xs transition-all cursor-pointer ${
              isDataSaver
                ? "bg-emerald-600/90 hover:bg-emerald-600 text-white shadow-md shadow-emerald-600/20 border border-emerald-500/40 ring-2 ring-emerald-500/30"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80"
            }`}
          >
            <Zap className={`w-4 h-4 sm:w-5 sm:h-5 ${isDataSaver ? "text-amber-300 fill-amber-300" : "text-slate-400"}`} />
            <span className="hidden lg:inline">{isDataSaver ? "Data Saver: ON" : "Data Saver"}</span>
          </button>

          {/* Device Settings */}
          <button
            onClick={() => setShowSettingsModal(true)}
            title="Media Device Settings"
            className="p-2.5 sm:px-3 sm:py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 font-bold text-xs transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            <span className="hidden xl:inline">Settings</span>
          </button>

          {/* Raise Hand (Student) */}
          {!isHost && (
            <button
              onClick={toggleHandRaise}
              title="Raise hand to ask question"
              className={`p-2.5 sm:px-4 sm:py-3 rounded-2xl flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                handRaised
                  ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-lg shadow-amber-500/30 animate-bounce"
                  : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80"
              }`}
            >
              <Hand className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">{handRaised ? "Hand Raised" : "Raise Hand"}</span>
            </button>
          )}

          {/* Chat Drawer Button */}
          <button
            onClick={() => {
              setActiveSideDrawer((d) => (d === "chat" ? null : "chat"));
              setUnreadChatCount(0);
            }}
            title="Chat"
            className={`relative p-2.5 sm:px-4 sm:py-3 rounded-2xl flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
              activeSideDrawer === "chat"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80"
            }`}
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            <span className="hidden sm:inline">Chat</span>
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-bounce">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Participants Drawer Button */}
          <button
            onClick={() => setActiveSideDrawer((d) => (d === "participants" ? null : "participants"))}
            title="Participants"
            className={`p-2.5 sm:px-4 sm:py-3 rounded-2xl flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
              activeSideDrawer === "participants"
                ? "bg-teal-600 text-white shadow-lg shadow-teal-600/30"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80"
            }`}
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400" />
            <span className="hidden sm:inline">Users ({allParticipants.length})</span>
          </button>
        </div>

        {/* Right Exit / End Button */}
        <div className="flex items-center gap-2">
          {isHost ? (
            <button
              onClick={() => setShowEndModal(true)}
              className="px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span className="hidden sm:inline">End Class</span>
            </button>
          ) : (
            <button
              onClick={handleLeaveClass}
              className="px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span className="hidden sm:inline">Leave Room</span>
            </button>
          )}
        </div>
      </footer>

      {/* ── Device Settings Modal ── */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Audio & Video Settings</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Microphone</label>
                <select
                  value={selectedAudioDevice}
                  onChange={(e) => handleDeviceChange("audioinput", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Default Microphone</option>
                  {audioInputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Camera</label>
                <select
                  value={selectedVideoDevice}
                  onChange={(e) => handleDeviceChange("videoinput", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Default Camera</option>
                  {videoInputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">Low-Bandwidth Mode</p>
                    <p className="text-[11px] text-slate-400">Prioritizes audio stability over incoming video</p>
                  </div>
                  <button
                    onClick={toggleDataSaver}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      isDataSaver ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {isDataSaver ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── End Class Confirmation Modal (Teacher) ── */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">End Class Session?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Ending this class will disconnect all connected students, finalize attendance, and mark the session as complete.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEndClassForEveryone}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
              >
                Yes, End Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
