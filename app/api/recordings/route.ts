import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Recording } from "@/lib/models/Recording"
import { GridFSBucket, type ObjectId } from "mongodb"
import { Readable } from "stream"

// GET /api/recordings - List all recordings
export async function GET() {
  try {
    await connectToDatabase()

    const recordings = await Recording.find()
      .sort({ createdAt: -1 })
      .select("title filename size duration createdAt")
      .lean()

    // Add URL for each recording
    const recordingsWithUrls = recordings.map((recording) => ({
      ...recording,
      _id: recording._id.toString(),
      url: `/api/recordings/${recording._id.toString()}`,
    }))

    return NextResponse.json(recordingsWithUrls)
  } catch (error) {
    console.error("Error fetching recordings:", error)
    return NextResponse.json({ error: "Failed to fetch recordings" }, { status: 500 })
  }
}

// POST /api/recordings - Upload new recording
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("recording") as File
    const title = formData.get("title") as string
    const duration = Number.parseInt(formData.get("duration") as string)
    const size = Number.parseInt(formData.get("size") as string)

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("video/")) {
      return NextResponse.json({ error: "Invalid file type. Only video files are allowed." }, { status: 400 })
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 100MB." }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Create GridFS bucket for file storage
    const bucket = new GridFSBucket(db, { bucketName: "recordings" })

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `recording-${timestamp}.webm`

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload file to GridFS
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        originalName: file.name,
        contentType: file.type,
        uploadDate: new Date(),
      },
    })

    const readable = new Readable()
    readable.push(buffer)
    readable.push(null)

    // Upload the file
    const fileId = await new Promise<ObjectId>((resolve, reject) => {
      readable
        .pipe(uploadStream)
        .on("error", reject)
        .on("finish", () => resolve(uploadStream.id as ObjectId))
    })

    // Save recording metadata to database
    const recording = new Recording({
      title: title || `Recording ${new Date().toLocaleString()}`,
      filename,
      fileId,
      size: file.size,
      duration: duration || 0,
      contentType: file.type,
      createdAt: new Date(),
    })

    await recording.save()

    return NextResponse.json({
      message: "Recording uploaded successfully",
      id: recording._id.toString(),
      url: `/api/recordings/${recording._id.toString()}`,
    })
  } catch (error) {
    console.error("Error uploading recording:", error)
    return NextResponse.json({ error: "Failed to upload recording" }, { status: 500 })
  }
}
