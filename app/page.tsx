"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Upload, Download, Search, CheckCircle, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useRouter } from "next/navigation"

// Define the attendee type
interface Attendee {
  firstName: string
  lastName: string
  email: string
  checkedIn: boolean
  source?: string
}

export default function EventCheckIn() {
  // State for attendees and UI
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(
    null,
  )
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [source, setSource] = useState<string>("")
  const [otherSource, setOtherSource] = useState<string>("")
  const [isUploaded, setIsUploaded] = useState(false)

  // Load attendees from localStorage on component mount
  useEffect(() => {
    const storedAttendees = localStorage.getItem("eventAttendees")
    if (storedAttendees) {
      setAttendees(JSON.parse(storedAttendees))
      setIsUploaded(true)
    }
  }, [])

  // Save attendees to localStorage whenever they change
  useEffect(() => {
    if (attendees.length > 0) {
      localStorage.setItem("eventAttendees", JSON.stringify(attendees))
    }
  }, [attendees])

  // Handle CSV file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string
        const lines = csv.split("\n")

        // Skip header row if it exists
        const startIndex =
          lines[0].toLowerCase().includes("first") ||
          lines[0].toLowerCase().includes("email")
            ? 1
            : 0

        const parsedAttendees: Attendee[] = []

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim()
          if (line) {
            const values = line.split(",")
            if (values.length >= 3) {
              parsedAttendees.push({
                firstName: values[0].trim(),
                lastName: values[1].trim(),
                email: values[2].trim(),
                checkedIn: false,
              })
            }
          }
        }

        if (parsedAttendees.length === 0) {
          toast({
            title: "Error",
            description: "No valid attendees found in CSV",
            variant: "destructive",
          })
          return
        }

        setAttendees(parsedAttendees)
        setIsUploaded(true)
        toast({
          title: "Success",
          description: `Uploaded ${parsedAttendees.length} attendees`,
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to parse CSV file",
          variant: "destructive",
        })
        console.error("Error parsing CSV:", error)
      }
    }
    reader.readAsText(file)
  }

  // Handle local storage reset
  const handleReset = () => {
    localStorage.removeItem("eventAttendees")
    setAttendees([])
    setIsUploaded
    toast({
      title: "Reset",
      description: "Attendees list has been reset",
      variant: "destructive",
    })
  }

  // Filter attendees based on search query
  const filteredAttendees = attendees.filter((attendee) => {
    const fullName = `${attendee.firstName} ${attendee.lastName}`.toLowerCase()
    const email = attendee.email.toLowerCase()
    const query = searchQuery.toLowerCase()
    return fullName.includes(query) || email.includes(query)
  })

  // Handle attendee selection for check-in
  const handleAttendeeSelect = (attendee: Attendee) => {
    setSelectedAttendee(attendee)
    setSource("")
    setOtherSource("")
    setShowCheckInModal(true)
  }

  // Handle check-in confirmation
  const handleCheckInConfirm = () => {
    if (!selectedAttendee) return

    const finalSource = source === "Other" ? otherSource : source

    setAttendees((prev) =>
      prev.map((a) =>
        a.email === selectedAttendee.email
          ? { ...a, checkedIn: true, source: finalSource }
          : a,
      ),
    )

    setShowCheckInModal(false)
    toast({
      title: "Checked In",
      description: `${selectedAttendee.firstName} ${selectedAttendee.lastName} has been checked in.`,
    })
  }

  // Generate and download CSV
  const handleDownload = () => {
    // Create CSV header
    let csv = "First Name,Last Name,Email,Source\n"

    // Add each attendee as a row
    attendees.forEach((attendee) => {
      csv += `${attendee.firstName},${attendee.lastName},${attendee.email},${
        attendee.source || ""
      }\n`
    })

    // Create download link
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    // Set filename with current date
    const date = new Date().toISOString().split("T")[0]
    link.download = `event-attendees-${date}.csv`

    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  // Calculate check-in progress
  const checkedInCount = attendees.filter((a) => a.checkedIn).length
  const progressPercentage =
    attendees.length > 0 ? (checkedInCount / attendees.length) * 100 : 0

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <Toaster />

      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold">Event Check-In</h1>

        {isUploaded && (
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              onClick={handleDownload}
              className="flex items-center gap-2 w-full md:w-auto"
              variant="outline"
            >
              <Download size={20} />
              <span>Download CSV</span>
            </Button>
          </div>
        )}
      </header>

      {/* Upload Screen */}
      {!isUploaded ? (
        <div className="flex flex-col items-center justify-center h-[70vh] gap-6 text-center">
          <div className="max-w-md">
            <h2 className="text-xl font-semibold mb-2">Upload Attendee List</h2>
            <p className="text-muted-foreground mb-6">
              Upload a CSV file with columns for first name, last name, and
              email address.
            </p>

            <label htmlFor="csv-upload">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center gap-4">
                  <Upload size={48} className="text-muted-foreground" />
                  <span className="font-medium">Click to upload CSV</span>
                  <span className="text-sm text-muted-foreground">
                    or drag and drop
                  </span>
                </div>
              </div>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      ) : (
        /* Attendee List Screen */
        <div className="space-y-4">
          {/* Search and Progress */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search attendees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {checkedInCount} of {attendees.length} checked in
              </span>
              <span className="text-sm font-medium">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Attendee List */}
          <div className="space-y-2 mt-4">
            {filteredAttendees.length > 0 ? (
              filteredAttendees.map((attendee, index) => (
                <div
                  key={index}
                  onClick={() => handleAttendeeSelect(attendee)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    attendee.checkedIn
                      ? "bg-primary/10 border-primary/20"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {attendee.checkedIn ? (
                      <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-lg truncate">
                        {attendee.firstName} {attendee.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {attendee.email}
                      </div>
                      {attendee.source && (
                        <div className="text-xs text-primary mt-1">
                          Source: {attendee.source}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                No attendees found matching your search
              </div>
            )}
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">Reset Attendees</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Are you sure?</DialogTitle>
              <p>
                Are you sure you want to reset the attendees list? This action
                cannot be undone.
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose>
                  <Button variant="destructive" onClick={handleReset}>
                    Reset
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Check-in Modal */}
      <Dialog open={showCheckInModal} onOpenChange={setShowCheckInModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedAttendee &&
                `Check in ${selectedAttendee.firstName} ${selectedAttendee.lastName}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <h3 className="text-lg font-medium mb-4">
                How did you hear about this event?
              </h3>

              <RadioGroup
                value={source}
                onValueChange={setSource}
                className="gap-3"
              >
                {[
                  "Instagram Ad",
                  "Instagram Non-Ad",
                  "Flyer",
                  "Luma",
                  "Word of Mouth",
                  "Other",
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={option}
                      id={option}
                      className="h-5 w-5"
                    />
                    <Label
                      htmlFor={option}
                      className="text-base cursor-pointer py-2"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {source === "Other" && (
                <div className="mt-4">
                  <Label htmlFor="other-source" className="mb-2 block">
                    Please specify:
                  </Label>
                  <Textarea
                    id="other-source"
                    value={otherSource}
                    onChange={(e) => setOtherSource(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCheckInModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCheckInConfirm}
                disabled={!source || (source === "Other" && !otherSource)}
              >
                Check In
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
