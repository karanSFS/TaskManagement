"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { updateProfile } from "@/lib/actions/auth"
import { profileSchema, type ProfileValues } from "@/lib/validations/auth"

type ProfileFormProps = {
  email: string
  fullName: string
}

export function ProfileForm({ email, fullName }: ProfileFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName },
  })

  const [savedName, setSavedName] = useState(fullName)

  function onSubmit(values: ProfileValues) {
    startTransition(async () => {
      const result = await updateProfile(values)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      setSavedName(values.fullName)
      toast.success(result?.success ?? "Profile updated.")
      router.refresh()
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-md gap-4" noValidate>
        <FormItem>
          <FormLabel>Email</FormLabel>
          <Input value={email} disabled readOnly />
          <FormDescription>Email is managed by your sign-in account.</FormDescription>
        </FormItem>
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormDescription>
                Shown in the account menu. Saved name: {savedName || "not set"}.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </Form>
  )
}
