import mongoose, { Schema, type Document } from "mongoose";
import type { ObjectId } from "mongodb";

export interface IRecording extends Document {
  title: string;
  filename: string;
  fileId: ObjectId;
  size: number;
  duration: number;
  contentType: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecordingSchema = new Schema<IRecording>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    filename: {
      type: String,
      required: true,
      unique: true,
    },
    fileId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "fs.files",
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
      max: 180, // 3 minutes max
    },
    contentType: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => v.startsWith("video/"),
        message: "Content type must be a video format",
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for better query performance
RecordingSchema.index({ createdAt: -1 });
// Note: filename already has unique index from unique: true property

// Pre-remove middleware to clean up GridFS files
RecordingSchema.pre("findOneAndDelete", async function () {
  const doc = await this.model.findOne(this.getQuery());
  if (doc) {
    const { GridFSBucket } = require("mongodb");
    const { connectToDatabase } = require("../mongodb");

    try {
      const { db } = await connectToDatabase();
      const bucket = new GridFSBucket(db, { bucketName: "recordings" });
      await bucket.delete(doc.fileId);
    } catch (error) {
      console.error("Error deleting GridFS file:", error);
    }
  }
});

export const Recording =
  mongoose.models.Recording ||
  mongoose.model<IRecording>("Recording", RecordingSchema);
