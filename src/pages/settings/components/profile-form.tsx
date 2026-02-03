import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { type Profile } from "@/services/profile-api-function"

type ProfileFormProps = {
  user: Profile | null
  onUpdateUser: (user: Profile) => void
  isLoading: boolean
  error: string | null
  onSubmit: (e: React.FormEvent) => void
}

export default function ProfileForm({
  user,
  onUpdateUser,
  isLoading,
  error,
  onSubmit,
}: ProfileFormProps) {
  // Handle the case where user is null
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Loading your profile...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Loading profile data...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>Update your personal details</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input 
              id="name" 
              value={user.display_name || ''} 
              onChange={(e) => onUpdateUser({ ...user, display_name: e.target.value })} 
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user.email} disabled />
            <p className="text-sm text-muted-foreground">
              Your email address is used for login and cannot be changed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personal_context">Personal Context</Label>
            <Textarea 
              id="personal_context"
              value={user.personal_context || ''} 
              onChange={(e) => onUpdateUser({ ...user, personal_context: e.target.value })} 
              placeholder="Add personal context that will be used in your sales calls (e.g., your background, experience, unique selling points...)"
              className="min-h-[100px]"
            />
            <p className="text-sm text-muted-foreground">
              This context will be included in your sales call frameworks to personalize conversations
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter>
          <Button type="submit" className="ml-auto" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

