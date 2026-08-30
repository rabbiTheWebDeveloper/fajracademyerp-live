import { AccessToken } from "livekit-server-sdk";

/**
 * Generates a LiveKit Video SDK Access Token
 *
 * @param {Object} options
 * @param {string} options.roomName - LiveKit room identifier
 * @param {string} options.identity - Unique participant identity (e.g. "teacher_65b..." or "student_65b...")
 * @param {string} [options.name] - Participant display name
 * @param {string|object} [options.metadata] - Optional custom metadata (JSON string or object)
 * @param {boolean} [options.isHost] - Whether this participant is a host (Teacher/Admin)
 * @param {number} [options.ttlSeconds] - Token TTL in seconds (default: 14400 / 4 hours)
 * @returns {Promise<{ token: string, serverUrl: string }>}
 */
export async function generateLiveKitToken({
  roomName,
  identity,
  name = "Participant",
  metadata = {},
  isHost = false,
  ttlSeconds = 14400,
}) {
  const apiKey = process.env.LIVEKIT_API_KEY || "APIJVEXz2TWJp3p";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "l5cWXnhEYxoef02gH6n4gR6RzeRevlJ6dH2WXUbWRrFD";
  const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://huuihhuoiu-dud747ko.livekit.cloud";

  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit API credentials missing. Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in your .env file.");
  }

  if (!roomName) {
    throw new Error("roomName is required for LiveKit token generation.");
  }

  if (!identity) {
    throw new Error("identity is required for LiveKit token generation.");
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: String(identity),
    name: String(name),
    metadata: typeof metadata === "object" ? JSON.stringify(metadata) : String(metadata || ""),
    ttl: `${ttlSeconds}s`,
  });

  at.addGrant({
    roomJoin: true,
    room: String(roomName),
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: Boolean(isHost),
    roomRecord: Boolean(isHost),
  });

  const token = await at.toJwt();

  return {
    token,
    serverUrl: livekitUrl,
  };
}
