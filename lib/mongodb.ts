import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local")
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// Global cache to prevent multiple connections in development
declare global {
  var myMongoose: MongooseCache | undefined
}

let cached = global.myMongoose

if (!cached) {
  cached = global.myMongoose = { conn: null, promise: null }
}

export async function connectToDatabase() {
  if (cached!.conn) {
    return {
      db: cached!.conn.connection.db,
      client: cached!.conn.connection.getClient(),
    }
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    }

    cached!.promise = mongoose.connect(MONGODB_URI!, opts)
  }

  try {
    cached!.conn = await cached!.promise
    return {
      db: cached!.conn.connection.db,
      client: cached!.conn.connection.getClient(),
    }
  } catch (e) {
    cached!.promise = null
    throw e
  }
}
