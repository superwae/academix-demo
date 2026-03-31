import { useAppStore } from '../store/useAppStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { toast } from 'sonner'
import { useState } from 'react'

export function ProfilePage() {
  const profile = useAppStore((s) => s.data.profile)
  const updateProfile = useAppStore((s) => s.updateProfile)

  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [major, setMajor] = useState(profile.major)
  const [year, setYear] = useState(profile.year)

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Profile</div>
        <div className="text-sm text-muted-foreground">Student info (demo preferences)</div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Student information</CardTitle>
          <CardDescription>Stored locally for this demo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Major">
              <Input value={major} onChange={(e) => setMajor(e.target.value)} />
            </Field>
            <Field label="Year">
              <Input value={year} onChange={(e) => setYear(e.target.value)} />
            </Field>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                updateProfile({ name, email, major, year })
                toast.success('Profile updated')
              }}
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      {children}
    </div>
  )
}



