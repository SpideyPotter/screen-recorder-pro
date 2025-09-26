"use client";
import { ScreenRecorder } from "@/components/screen-recorder"
import { RecordingsList } from "@/components/recordings-list"
import { FileUpload } from "@/components/file-upload"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">Screen Recorder Pro</h1>
            <p className="text-lg text-muted-foreground">Professional screen recording with microphone audio capture</p>
          </header>

          <ScreenRecorder />

          <FileUpload
            onUploadComplete={() => {
              // Trigger recordings list refresh
              window.dispatchEvent(new CustomEvent("recordingUploaded"))
            }}
          />

          <RecordingsList />
        </div>
      </div>
    </main>
  )
}
