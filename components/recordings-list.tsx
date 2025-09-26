"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Play,
  Download,
  Calendar,
  HardDrive,
  Trash2,
  Search,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  CheckSquare,
  Square,
  Minus,
} from "lucide-react"

interface Recording {
  _id: string
  title: string
  filename: string
  size: number
  duration: number
  createdAt: string
  url: string
}

type SortField = "createdAt" | "title" | "size" | "duration"
type SortOrder = "asc" | "desc"
type ViewMode = "list" | "grid"

export function RecordingsList() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField>("createdAt")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [viewMode, setViewMode] = useState<ViewMode>("list")

  useEffect(() => {
    fetchRecordings()

    const handleUploadComplete = () => {
      fetchRecordings()
    }

    window.addEventListener("recordingUploaded", handleUploadComplete)
    return () => window.removeEventListener("recordingUploaded", handleUploadComplete)
  }, [])

  const fetchRecordings = async () => {
    try {
      const response = await fetch("/api/recordings")
      if (response.ok) {
        const data = await response.json()
        setRecordings(data)
      }
    } catch (error) {
      console.error("Failed to fetch recordings:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort recordings
  const filteredAndSortedRecordings = useMemo(() => {
    let filtered = recordings

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = recordings.filter(
        (recording) =>
          recording.title.toLowerCase().includes(query) || recording.filename.toLowerCase().includes(query),
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      if (sortField === "createdAt") {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [recordings, searchQuery, sortField, sortOrder])

  const deleteRecording = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recording? This action cannot be undone.")) {
      return
    }

    setDeletingIds((prev) => new Set(prev).add(id))
    try {
      const response = await fetch(`/api/recordings/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setRecordings((prev) => prev.filter((r) => r._id !== id))
        setSelectedIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(id)
          return newSet
        })
        if (playingId === id) {
          setPlayingId(null)
        }
      } else {
        const errorData = await response.json()
        alert(`Failed to delete recording: ${errorData.error}`)
      }
    } catch (error) {
      console.error("Failed to delete recording:", error)
      alert("Failed to delete recording. Please try again.")
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const deleteSelectedRecordings = async () => {
    if (selectedIds.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedIds.size} recording(s)? This action cannot be undone.`)) {
      return
    }

    const idsToDelete = Array.from(selectedIds)
    setDeletingIds(new Set(idsToDelete))

    try {
      const deletePromises = idsToDelete.map((id) => fetch(`/api/recordings/${id}`, { method: "DELETE" }))

      const results = await Promise.allSettled(deletePromises)
      const successfulDeletes = results
        .map((result, index) => ({ result, id: idsToDelete[index] }))
        .filter(({ result }) => result.status === "fulfilled" && result.value.ok)
        .map(({ id }) => id)

      if (successfulDeletes.length > 0) {
        setRecordings((prev) => prev.filter((r) => !successfulDeletes.includes(r._id)))
        setSelectedIds(new Set())
        if (playingId && successfulDeletes.includes(playingId)) {
          setPlayingId(null)
        }
      }

      const failedCount = idsToDelete.length - successfulDeletes.length
      if (failedCount > 0) {
        alert(`${failedCount} recording(s) failed to delete. Please try again.`)
      }
    } catch (error) {
      console.error("Failed to delete recordings:", error)
      alert("Failed to delete recordings. Please try again.")
    } finally {
      setDeletingIds(new Set())
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedRecordings.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAndSortedRecordings.map((r) => r._id)))
    }
  }

  const toggleSelectRecording = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"]
    if (bytes === 0) return "0 Bytes"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getSelectAllIcon = () => {
    if (selectedIds.size === 0) return <Square className="h-4 w-4" />
    if (selectedIds.size === filteredAndSortedRecordings.length) return <CheckSquare className="h-4 w-4" />
    return <Minus className="h-4 w-4" />
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Recordings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">Loading recordings...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Your Recordings</span>
            <Badge variant="secondary">{recordings.length} total</Badge>
            {filteredAndSortedRecordings.length !== recordings.length && (
              <Badge variant="outline">{filteredAndSortedRecordings.length} filtered</Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteSelectedRecordings}
                disabled={deletingIds.size > 0}
                className="gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Delete Selected ({selectedIds.size})
              </Button>
            )}

            <div className="flex items-center border border-border rounded-md">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-r-none"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-l-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recordings.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No recordings yet. Start recording or upload existing files to see them here!
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recordings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <Select value={sortField} onValueChange={(value: SortField) => setSortField(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Date</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="size">Size</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="gap-1"
                >
                  {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Bulk Actions */}
            {filteredAndSortedRecordings.length > 0 && (
              <div className="flex items-center gap-2 py-2 border-b border-border">
                <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="gap-2">
                  {getSelectAllIcon()}
                  Select All
                </Button>
                {selectedIds.size > 0 && (
                  <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
                )}
              </div>
            )}

            {/* Recordings Display */}
            {filteredAndSortedRecordings.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No recordings match your search criteria.</div>
            ) : viewMode === "list" ? (
              <div className="space-y-4">
                {filteredAndSortedRecordings.map((recording) => (
                  <div key={recording._id} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedIds.has(recording._id)}
                          onCheckedChange={() => toggleSelectRecording(recording._id)}
                          className="mt-1"
                        />
                        <div className="space-y-1">
                          <h3 className="font-medium text-foreground">{recording.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(recording.createdAt)}
                            </div>
                            <div className="flex items-center gap-1">
                              <HardDrive className="h-3 w-3" />
                              {formatFileSize(recording.size)}
                            </div>
                            <div>Duration: {formatDuration(recording.duration)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPlayingId(playingId === recording._id ? null : recording._id)
                          }}
                          className="gap-1"
                        >
                          <Play className="h-3 w-3" />
                          {playingId === recording._id ? "Hide" : "Play"}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const a = document.createElement("a")
                            a.href = recording.url
                            a.download = recording.filename
                            a.click()
                          }}
                          className="gap-1"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteRecording(recording._id)}
                          disabled={deletingIds.has(recording._id)}
                          className="gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                          {deletingIds.has(recording._id) ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>

                    {playingId === recording._id && (
                      <div className="pt-2">
                        <video
                          controls
                          className="w-full max-w-2xl rounded-lg bg-black"
                          style={{ aspectRatio: "16/9" }}
                          src={recording.url}
                          preload="metadata"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Grid View
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAndSortedRecordings.map((recording) => (
                  <div key={recording._id} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <Checkbox
                        checked={selectedIds.has(recording._id)}
                        onCheckedChange={() => toggleSelectRecording(recording._id)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRecording(recording._id)}
                        disabled={deletingIds.has(recording._id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-medium text-foreground text-sm line-clamp-2">{recording.title}</h3>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>{formatDate(recording.createdAt)}</div>
                        <div className="flex justify-between">
                          <span>{formatFileSize(recording.size)}</span>
                          <span>{formatDuration(recording.duration)}</span>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPlayingId(playingId === recording._id ? null : recording._id)
                          }}
                          className="flex-1 gap-1 text-xs"
                        >
                          <Play className="h-3 w-3" />
                          Play
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const a = document.createElement("a")
                            a.href = recording.url
                            a.download = recording.filename
                            a.click()
                          }}
                          className="flex-1 gap-1 text-xs"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </Button>
                      </div>
                    </div>

                    {playingId === recording._id && (
                      <div className="pt-2">
                        <video
                          controls
                          className="w-full rounded-lg bg-black"
                          style={{ aspectRatio: "16/9" }}
                          src={recording.url}
                          preload="metadata"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
