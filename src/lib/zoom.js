import crypto from "crypto";

/**
 * Generates a Zoom Video SDK JWT Token
 *
 * @param {Object} options
 * @param {string} options.sessionName - Zoom session topic name (tpc)
 * @param {number} options.roleType - 1 for Host (Teacher/Admin), 0 for Participant (Student)
 * @param {string} [options.userIdentity] - Unique user identifier (e.g. userId or username)
 * @param {string} [options.sessionKey] - Optional session password
 * @param {number} [options.expirationSeconds] - Expiry in seconds from now (default: 7200 / 2 hours)
 * @returns {string} JWT Token
 */
export function generateZoomVideoToken({
  sessionName,
  roleType = 0,
  userIdentity = "",
  sessionKey = "",
  expirationSeconds = 7200,
}) {
  const sdkKey = process.env.ZOOM_SDK_KEY;
  const sdkSecret = process.env.ZOOM_SDK_SECRET;

  if (!sdkKey || !sdkSecret) {
    throw new Error(
      "Zoom Video SDK credentials missing. Please define ZOOM_SDK_KEY and ZOOM_SDK_SECRET in your .env file."
    );
  }

  if (!sessionName) {
    throw new Error("Zoom sessionName (tpc) is required.");
  }

  const iat = Math.floor(Date.now() / 1000) - 30; // 30s buffer for clock drift
  const exp = iat + expirationSeconds;

  // Zoom Video SDK JWT Header
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  // Zoom Video SDK JWT Payload
  const payload = {
    app_key: sdkKey,
    tpc: sessionName,
    role_type: Number(roleType) === 1 ? 1 : 0,
    session_key: sessionKey || "",
    user_identity: userIdentity ? String(userIdentity) : "",
    version: 1,
    iat,
    exp,
  };

  // Base64URL Encoding helper
  const base64UrlEncode = (str) =>
    Buffer.from(str)
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", sdkSecret)
    .update(signatureInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signatureInput}.${signature}`;
}
