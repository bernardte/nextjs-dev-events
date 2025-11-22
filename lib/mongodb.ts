import mongoose from "mongoose";

// Shape of the cached connection object we store on the global object
interface MongooseCache {
  conn: typeof mongoose | null; // Resolved, reusable Mongoose connection
  promise: Promise<typeof mongoose> | null; // In-flight connection promise to avoid duplicate connects
}

// Augment the global type so TypeScript knows about our cache variable
declare global {
  // eslint-disable-next-line no-var
  // Using `var` attaches the value to the Node.js global object across reloads in development
  var _mongooseCache: MongooseCache | undefined;
}

// Read the MongoDB connection string from environment variables.
// In production you should set this in your deployment environment.
const MONGODB_URI = process.env.MONGODB_URI;

// Reuse the existing cache if it exists (important in development with Next.js hot reloading)
const cached: MongooseCache = globalThis._mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!globalThis._mongooseCache) {
  globalThis._mongooseCache = cached;
}

/**
 * Establishes (or reuses) a single Mongoose connection.
 *
 * This function is safe to call from API routes, server components, and
 * route handlers. It avoids creating multiple connections during
 * development by caching both the connection and any in-flight
 * connection attempt on the global object.
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  // If we already have an active connection, reuse it.
  if (cached.conn) {
    return cached.conn;
  }

  // If a connection is already being established, wait for it.
  if (!cached.promise) {
    const options: mongoose.ConnectOptions = {
      // Add any desired Mongoose options here
      bufferCommands: false,
    };

    //validate mondodb uri connection exists
    if (!MONGODB_URI) {
      throw new Error(
        "Please define the MONGODB_URI environment variable in your environment or .env.local file."
      );
    }

    cached.promise = mongoose.connect(MONGODB_URI!, options).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // If connection fails, reset the promise so future calls can retry
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectToDatabase;
