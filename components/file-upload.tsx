"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, X, FileVideo, AlertTriangle, CheckCircle, RotateCcw } from "lucide-react"

interface UploadFile {
  id: string
  file: File
  progress: number
  status: "pending" | "uploading" | "success" | "error"
  error?: string
  retryCount: number
}

interface FileUploadProps {
  onUploadComplete?: () => void
  maxFileSize?: number // in bytes
  maxFiles?: number
}

export function FileUpload({ onUploadComplete, maxFileSize = 100 * 1024 * 1024, maxFiles = 5 }: FileUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateId = () => Math.random().toString(36).substr(2, 9)

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith("video/")) {
      return "Only video files are allowed"
    }

    if (file.size > maxFileSize) {
      return `File size must be less than ${Math.round(maxFileSize / (1024 * 1024))}MB`
    }

    // Check for supported video formats
    const supportedFormats = ["video/webm", "video/mp4", "video/avi", "video/mov", "video/quicktime"]
    if (!supportedFormats.some((format) => file.type.includes(format.split("/")[1]))) {
      return "Unsupported video format. Please use WebM, MP4, AVI, or MOV files"
    }

    return null
  }

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files)

      if (uploadFiles.length + fileArray.length > maxFiles) {
        alert(`Maximum ${maxFiles} files allowed`)
        return
      }

      const newUploadFiles: UploadFile[] = []

      for (const file of fileArray) {
        const error = validateFile(file)
        newUploadFiles.push({
          id: generateId(),
          file,
          progress: 0,
          status: error ? "error" : "pending",
          error: error ?? undefined,
          retryCount: 0,
        })
      }

      setUploadFiles((prev) => [...prev, ...newUploadFiles])
    },
    [uploadFiles.length, maxFiles],
  )

  const removeFile = (id: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const uploadFile = async (uploadFile: UploadFile): Promise<void> => {
    const { id, file } = uploadFile

    setUploadFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "uploading" as const, progress: 0, error: undefined } : f)),
    )

    try {
      const formData = new FormData()
      formData.append("recording", file)
      formData.append("title", file.name.replace(/\.[^/.]+$/, "")) // Remove extension
      formData.append("size", file.size.toString())

      // Estimate duration from file size (rough approximation)
      const estimatedDuration = Math.min(Math.round((file.size / (1024 * 1024)) * 10), 180)
      formData.append("duration", estimatedDuration.toString())

      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress } : f)))
        }
      })

      // Handle completion
      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          setUploadFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, status: "success" as const, progress: 100 } : f)),
          )
          onUploadComplete?.()
        } else {
          const errorData = JSON.parse(xhr.responseText)
          throw new Error(errorData.error || "Upload failed")
        }
      })

      // Handle errors
      xhr.addEventListener("error", () => {
        throw new Error("Network error during upload")
      })

      xhr.addEventListener("timeout", () => {
        throw new Error("Upload timeout")
      })

      // Configure and send request
      xhr.open("POST", "/api/recordings")
      xhr.timeout = 300000 // 5 minutes timeout
      xhr.send(formData)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed"
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: "error" as const,
                error: errorMessage,
                retryCount: f.retryCount + 1,
              }
            : f,
        ),
      )
    }
  }

  const retryUpload = (file: UploadFile) => {
    if (file.retryCount < 3) {
      uploadFile(file)
    }
  }

  const uploadAll = async () => {
    const pendingFiles = uploadFiles.filter((f) => f.status === "pending" || f.status === "error")

    for (const file of pendingFiles) {
      if (file.error && file.retryCount >= 3) continue // Skip files that have failed too many times
      await uploadFile(file)
    }
  }

  const clearCompleted = () => {
    setUploadFiles((prev) => prev.filter((f) => f.status !== "success"))
  }

  const clearAll = () => {
    setUploadFiles([])
  }

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        addFiles(files)
      }
    },
    [addFiles],
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      addFiles(files)
    }
    // Reset input value to allow selecting the same file again
    e.target.value = ""
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"]
    if (bytes === 0) return "0 Bytes"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const getStatusColor = (status: UploadFile["status"]) => {
    switch (status) {
      case "pending":
        return "text-muted-foreground"
      case "uploading":
        return "text-primary"
      case "success":
        return "text-green-400"
      case "error":
        return "text-destructive"
      default:
        return "text-muted-foreground"
    }
  }

  const getStatusIcon = (uploadFile: UploadFile) => {
    switch (uploadFile.status) {
      case "pending":
        return <FileVideo className="h-4 w-4 text-muted-foreground" />
      case "uploading":
        return <Upload className="h-4 w-4 text-primary animate-pulse" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case "error":
        return <AlertTriangle className="h-4 w-4 text-destructive" />
      default:
        return <FileVideo className="h-4 w-4" />
    }
  }

  const pendingCount = uploadFiles.filter((f) => f.status === "pending" || f.status === "error").length
  const successCount = uploadFiles.filter((f) => f.status === "success").length
  const uploadingCount = uploadFiles.filter((f) => f.status === "uploading").length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Upload Recordings</span>
          {uploadFiles.length > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={clearCompleted} disabled={successCount === 0}>
                Clear Completed
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-primary/5"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <div className="space-y-2">
            <p className="text-lg font-medium">Drop video files here or click to browse</p>
            <p className="text-sm text-muted-foreground">
              Supports WebM, MP4, AVI, MOV files up to {Math.round(maxFileSize / (1024 * 1024))}MB
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4"
              disabled={uploadFiles.length >= maxFiles}
            >
              Select Files
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Upload Status */}
        {uploadFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {uploadFiles.length} file{uploadFiles.length !== 1 ? "s" : ""} • {successCount} completed •{" "}
                {uploadingCount} uploading • {pendingCount} pending
              </div>
              {pendingCount > 0 && (
                <Button onClick={uploadAll} disabled={uploadingCount > 0} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload All ({pendingCount})
                </Button>
              )}
            </div>

            {/* File List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {uploadFiles.map((fileObj) => (
                <div key={fileObj.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getStatusIcon(fileObj)}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{fileObj.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(fileObj.file.size)} • {fileObj.file.type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {fileObj.status === "error" && fileObj.retryCount < 3 && (
                        <Button variant="ghost" size="sm" onClick={() => retryUpload(fileObj)} className="gap-1">
                          <RotateCcw className="h-3 w-3" />
                          Retry
                        </Button>
                      )}

                      {fileObj.status === "pending" && (
                        <Button variant="ghost" size="sm" onClick={() => uploadFile(fileObj)} className="gap-1">
                          <Upload className="h-3 w-3" />
                          Upload
                        </Button>
                      )}

                      <Button variant="ghost" size="sm" onClick={() => removeFile(fileObj.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {fileObj.status === "uploading" && (
                    <div className="space-y-1">
                      <Progress value={fileObj.progress} className="h-2" />
                      <p className="text-xs text-center text-muted-foreground">{fileObj.progress}%</p>
                    </div>
                  )}

                  {/* Error Message */}
                  {fileObj.error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {fileObj.error}
                        {fileObj.retryCount >= 3 && " (Max retries reached)"}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Success Message */}
                  {fileObj.status === "success" && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">Upload completed successfully!</AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Info */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Maximum {maxFiles} files, {Math.round(maxFileSize / (1024 * 1024))}MB each. Supported formats: WebM, MP4,
            AVI, MOV.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
