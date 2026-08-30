/**
 * Google OAuth2 Token Generator
 * Run this script ONCE to get a refresh token for your Google account.
 * 
 * Steps:
 * 1. Create OAuth2 credentials at: https://console.cloud.google.com/apis/credentials
 *    - Click "Create Credentials" > "OAuth client ID"
 *    - Application type: Desktop app
 *    - Download the JSON, or copy Client ID and Client Secret
 * 2. Add to .env: GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET
 * 3. Run: node --env-file=.env scripts/generate-google-token.mjs
 * 4. Visit the URL printed, authorize your Google account
 * 5. Paste the authorization code when prompted
 * 6. Copy the printed GOOGLE_OAUTH_REFRESH_TOKEN into your .env
 */

import { google } from "googleapis";
import * as readline from "readline";

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("❌ GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set in .env");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  "urn:ietf:wg:oauth:2.0:oob" // Out-of-band redirect for desktop apps
);

const scopes = ["https://www.googleapis.com/auth/calendar"];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: scopes,
  prompt: "consent", // Force refresh token to be returned
});

console.log("\n========================================================");
console.log("STEP 1: Open this URL in your browser and log in with");
console.log("the Google account you want to use for Meet link creation:");
console.log("========================================================\n");
console.log(authUrl);
console.log("\n========================================================");
console.log("STEP 2: After authorizing, copy the code shown and paste it below.");
console.log("========================================================\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("Paste the authorization code here: ", async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    console.log("\n✅ Success! Add these to your .env file:\n");
    console.log(`GOOGLE_OAUTH_CLIENT_ID=${clientId}`);
    console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${clientSecret}`);
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("\n🎉 Your Google Meet links will now be real and working!");
  } catch (err) {
    console.error("❌ Failed to get token:", err.message);
  }
});
