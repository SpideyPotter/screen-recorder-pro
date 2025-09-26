// Database setup script for MongoDB
const { MongoClient, GridFSBucket } = require("mongodb")

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/screen-recorder"

async function setupDatabase() {
  console.log("Setting up MongoDB database...")

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db()

    // Create collections with proper indexes
    console.log("Creating recordings collection...")
    const recordingsCollection = db.collection("recordings")

    // Create indexes for better performance
    await recordingsCollection.createIndex({ createdAt: -1 })
    await recordingsCollection.createIndex({ filename: 1 }, { unique: true })
    await recordingsCollection.createIndex({ fileId: 1 })

    console.log("Created indexes for recordings collection")

    // Ensure GridFS collections exist
    console.log("Setting up GridFS for file storage...")
    const bucket = new GridFSBucket(db, { bucketName: "recordings" })

    // Create a test file to ensure GridFS is working (then delete it)
    const testBuffer = Buffer.from("test")
    const uploadStream = bucket.openUploadStream("test-file.txt")

    uploadStream.end(testBuffer)

    uploadStream.on("finish", async () => {
      console.log("GridFS setup successful")

      // Delete the test file
      await bucket.delete(uploadStream.id)
      console.log("Test file cleaned up")

      console.log("Database setup completed successfully!")
      await client.close()
    })
  } catch (error) {
    console.error("Database setup failed:", error)
    await client.close()
    process.exit(1)
  }
}

setupDatabase()
