import { useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg } from '@fullcalendar/core'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { useAppStore } from '../store/useAppStore'
import type { DayOfWeek } from '../types/academix'

const DOW_TO_INDEX: Record<DayOfWeek, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

export function CalendarPage() {
  const calendarRef = useRef<FullCalendar | null>(null)
  const { courses, enrolled } = useAppStore((s) => s.data)

  const [eventOpen, setEventOpen] = useState(false)
  const [eventInfo, setEventInfo] = useState<{
    title: string
    instructor: string
    location: string
    courseId: string
    sectionId: string
  } | null>(null)

  const events = useMemo(() => {
    const now = new Date()
    const startOfWeek = startOfWeekDate(now)
    return enrolled.flatMap((e) => {
      const course = courses.find((c) => c.id === e.courseId)
      if (!course) return []
      const section = course.sections.find((s) => s.id === e.sectionId)
      if (!section) return []
      return section.meetingTimes.map((mt) => {
        const start = addMinutes(addDays(startOfWeek, DOW_TO_INDEX[mt.day]), mt.startMin)
        const end = addMinutes(addDays(startOfWeek, DOW_TO_INDEX[mt.day]), mt.endMin)
        return {
          id: `${course.id}:${section.id}:${mt.day}:${mt.startMin}`,
          title: course.title,
          start,
          end,
          backgroundColor: 'hsl(var(--primary))',
          borderColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--primary-foreground))',
          extendedProps: {
            courseId: course.id,
            sectionId: section.id,
            instructor: course.instructor,
            location: section.locationLabel,
          },
        }
      })
    })
  }, [courses, enrolled])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Calendar</div>
          <div className="text-sm text-muted-foreground">Weekly schedule of enrolled classes</div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              calendarRef.current?.getApi().today()
            }}
          >
            Today
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              calendarRef.current?.getApi().prev()
            }}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              calendarRef.current?.getApi().next()
            }}
          >
            Next
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Week view</CardTitle>
          <CardDescription>Click an event for details</CardDescription>
        </CardHeader>
        <CardContent>
          {enrolled.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-6">
              <div className="text-sm font-medium">No enrolled classes</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Enroll from the catalog to see events appear here.
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-background p-2">
              <FullCalendar
                ref={(r) => {
                  calendarRef.current = (r as unknown as FullCalendar | null) ?? null
                }}
                plugins={[timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={false}
                allDaySlot={false}
                nowIndicator
                height="auto"
                slotMinTime="07:00:00"
                slotMaxTime="21:00:00"
                events={events}
                eventClick={(arg: EventClickArg) => {
                  const ext = arg.event.extendedProps as unknown as {
                    courseId: string
                    sectionId: string
                    instructor: string
                    location: string
                  }
                  setEventInfo({
                    title: arg.event.title,
                    instructor: ext.instructor,
                    location: ext.location,
                    courseId: ext.courseId,
                    sectionId: ext.sectionId,
                  })
                  setEventOpen(true)
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={eventOpen} onOpenChange={setEventOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{eventInfo?.title}</DialogTitle>
            <DialogDescription>Class details</DialogDescription>
          </DialogHeader>
          {eventInfo && (
            <div className="mt-4 space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Instructor:</span> {eventInfo.instructor}
              </div>
              <div>
                <span className="text-muted-foreground">Location:</span> {eventInfo.location}
              </div>
              <div className="pt-2 text-xs text-muted-foreground">
                Quick links: Assignments • Messages (demo navigation available in sidebar)
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function startOfWeekDate(d: Date) {
  const date = new Date(d)
  const day = date.getDay() // 0=Sun
  // Use Sunday as start-of-week for simplicity.
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(d: Date, days: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

function addMinutes(d: Date, minutes: number) {
  const x = new Date(d)
  x.setMinutes(x.getMinutes() + minutes)
  return x
}


