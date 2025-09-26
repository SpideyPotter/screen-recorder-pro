// MongoDB initialization script for Docker
// Note: 'db' is a global variable available in MongoDB shell context

// Declare the db variable
var db

// Switch to the screen-recorder database
db = db.getSiblingDB("screen-recorder")

// Create collections with proper indexes
db.createCollection("recordings")

// Create indexes for better performance
db.recordings.createIndex({ createdAt: -1 })
db.recordings.createIndex({ filename: 1 }, { unique: true })
db.recordings.createIndex({ fileId: 1 })

print("Database initialized successfully")
