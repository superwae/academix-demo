import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { toast } from 'sonner'

export function AssignmentsPage() {
  const { assignments, courses, submissions } = useAppStore((s) => s.data)
  const upsertSubmission = useAppStore((s) => s.upsertSubmission)

  const [courseFilter, setCourseFilter] = useState<string>('All')
  const [openId, setOpenId] = useState<string | null>(null)
  const open = useMemo(() => assignments.find((a) => a.id === openId) ?? null, [assignments, openId])
  const openCourse = useMemo(() => (open ? courses.find((c) => c.id === open.courseId) : undefined), [open, courses])
  const existingSub = useMemo(() => {
    if (!open) return undefined
    return submissions.find((s) => s.assignmentId === open.id)
  }, [open, submissions])

  const [text, setText] = useState('')
  const [fileMeta, setFileMeta] = useState<{ name?: string; size?: number }>({})

  const filtered = useMemo(() => {
    return assignments
      .filter((a) => courseFilter === 'All' || a.courseId === courseFilter)
      .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt))
  }, [assignments, courseFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Assignments</div>
          <div className="text-sm text-muted-foreground">Draft, submit, and track status (frontend-only)</div>
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
        >
          <option value="All">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-6">
          <div className="text-sm font-medium">No assignments yet</div>
          <div className="mt-1 text-sm text-muted-foreground">Assignments will appear for enrolled courses in a full product.</div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((a) => {
            const course = courses.find((c) => c.id === a.courseId)
            const submission = submissions.find((s) => s.assignmentId === a.id)
            const status = submission ? 'Submitted' : a.status
            return (
              <Card key={a.id}>
                <CardHeader>
                  <CardTitle className="line-clamp-1">{a.title}</CardTitle>
                  <CardDescription className="line-clamp-1">{course?.title ?? 'Course'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="subtle">{status}</Badge>
                    <Badge variant="outline">Due {format(new Date(a.dueAt), 'MMM d, p')}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-2">{a.prompt}</div>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpenId(a.id)
                      setText(submission?.text ?? '')
                      setFileMeta({ name: submission?.fileName, size: submission?.fileSize })
                    }}
                  >
                    Open
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => (!o ? setOpenId(null) : null)}>
        <DialogContent className="max-w-2xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.title}</DialogTitle>
                <DialogDescription>
                  {openCourse?.title} • Due {format(new Date(open.dueAt), 'MMM d, p')}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-3">
                <div className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                  {open.prompt}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Submission (text)</div>
                  <textarea
                    className="min-h-[140px] w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Write your submission…"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Attachment (fake)</div>
                  <Input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setFileMeta({ name: file.name, size: file.size })
                    }}
                  />
                  {(fileMeta.name || existingSub?.fileName) && (
                    <div className="text-xs text-muted-foreground">
                      Attached: {fileMeta.name ?? existingSub?.fileName} ({Math.round((fileMeta.size ?? existingSub?.fileSize ?? 0) / 1024)} KB)
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenId(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    if (!open) return
                    if (!text.trim()) {
                      toast.error('Submission is empty', { description: 'Please add some text before submitting.' })
                      return
                    }
                    upsertSubmission({
                      assignmentId: open.id,
                      text,
                      fileName: fileMeta.name,
                      fileSize: fileMeta.size,
                      submittedAt: new Date().toISOString(),
                    })
                    toast.success('Assignment submitted', { description: open.title })
                    setOpenId(null)
                  }}
                >
                  Submit
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}



