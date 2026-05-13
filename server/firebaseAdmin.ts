import admin from "firebase-admin";

// Initialize Firebase Admin SDK with service account credentials from env
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export const firebaseAuth = admin.auth();

/**
 * Verify a Firebase ID token and return the decoded token.
 * Returns null if the token is invalid or expired.
 */
export async function verifyFirebaseToken(
  idToken: string
): Promise<admin.auth.DecodedIdToken | null> {
  try {
    const decoded = await firebaseAuth.verifyIdToken(idToken);
    return decoded;
  } catch (error) {
    console.warn("[Firebase Auth] Token verification failed:", error);
    return null;
  }
}
