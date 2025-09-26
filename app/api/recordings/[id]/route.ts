import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Recording } from "@/lib/models/Recording"
import { GridFSBucket, ObjectId } from "mongodb"

// GET /api/recordings/[id] - Stream individual recording
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid recording ID" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Find recording metadata
    const recording = await Recording.findById(id)
    if (!recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 })
    }

    // Create GridFS bucket
    const bucket = new GridFSBucket(db, { bucketName: "recordings" })

    // Check if file exists in GridFS
    const files = await bucket.find({ _id: recording.fileId }).toArray()
    if (files.length === 0) {
      return NextResponse.json({ error: "Recording file not found" }, { status: 404 })
    }

    const file = files[0]

    // Handle range requests for video streaming
    const range = request.headers.get("range")

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-")
      const start = Number.parseInt(parts[0], 10)
      const end = parts[1] ? Number.parseInt(parts[1], 10) : file.length - 1
      const chunksize = end - start + 1

      // Create download stream with range
      const downloadStream = bucket.openDownloadStream(recording.fileId, {
        start,
        end: end + 1,
      })

      const headers = new Headers({
        "Content-Range": `bytes ${start}-${end}/${file.length}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize.toString(),
        "Content-Type": recording.contentType || "video/webm",
      })

      return new Response(downloadStream as any, {
        status: 206,
        headers,
      })
    } else {
      // Full file download
      const downloadStream = bucket.openDownloadStream(recording.fileId)

      const headers = new Headers({
        "Content-Length": file.length.toString(),
        "Content-Type": recording.contentType || "video/webm",
        "Content-Disposition": `inline; filename="${recording.filename}"`,
      })

      return new Response(downloadStream as any, {
        status: 200,
        headers,
      })
    }
  } catch (error) {
    console.error("Error streaming recording:", error)
    return NextResponse.json({ error: "Failed to stream recording" }, { status: 500 })
  }
}

// DELETE /api/recordings/[id] - Delete recording
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid recording ID" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Find recording
    const recording = await Recording.findById(id)
    if (!recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 })
    }

    // Delete file from GridFS
    const bucket = new GridFSBucket(db, { bucketName: "recordings" })
    await bucket.delete(recording.fileId)

    // Delete recording metadata
    await Recording.findByIdAndDelete(id)

    return NextResponse.json({
      message: "Recording deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting recording:", error)
    return NextResponse.json({ error: "Failed to delete recording" }, { status: 500 })
  }
}
