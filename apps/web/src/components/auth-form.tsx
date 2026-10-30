"use client";

import { Button } from "@myfinds/ui/components/button";
import { Input } from "@myfinds/ui/components/input";
import { Label } from "@myfinds/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";

const schemaFor = (mode: "login" | "signup") =>
  z
    .object({
      name: z.string(),
      email: z.email("Enter a valid email address."),
      password: z.string().min(8, "Use at least 8 characters."),
    })
    .refine((values) => mode !== "signup" || values.name.trim().length >= 2, {
      path: ["name"],
      message: "Enter your name.",
    });

type AuthFormProps = {
  mode: "login" | "signup";
};

const copy = {
  login: {
    title: "Log in",
    description: "Pick up where your reports left off.",
    submit: "Log in",
    pending: "Logging in…",
    switchText: "Need an account?",
    switchLabel: "Sign up",
    switchHref: "/signup" as const,
  },
  signup: {
    title: "Create your account",
    description: "Verify your email and phone before you report an item.",
    submit: "Create account",
    pending: "Creating account…",
    switchText: "Already have an account?",
    switchLabel: "Log in",
    switchHref: "/login" as const,
  },
};

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const text = copy[mode];
  const schema = useMemo(() => schemaFor(mode), [mode]);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      if (mode === "login") {
        await authClient.signIn.email(
          { email: value.email, password: value.password },
          {
            onSuccess: () => {
              router.push("/reports");
              router.refresh();
            },
            onError: (error) => {
              toast.error(error.error.message || "Could not log in. Try again.");
            },
          },
        );
        return;
      }

      await authClient.signUp.email(
        { email: value.email, password: value.password, name: value.name },
        {
          onSuccess: () => {
            router.push("/reports");
            router.refresh();
          },
          onError: (error) => {
            toast.error(error.error.message || "Could not create the account. Try again.");
          },
        },
      );
    },
    validators: {
      onSubmit: schema,
    },
  });

  return (
    <div className="mx-auto w-full max-w-[26rem] px-4 py-12 sm:px-0 sm:py-16">
      <h1 className="text-[1.75rem] font-semibold tracking-tight">{text.title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text.description}</p>

      <form
        noValidate
        className="mt-8 grid gap-5 border border-border bg-card p-6"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        {mode === "signup" ? (
          <form.Field name="name">
            {(field) => {
              const error = field.state.meta.errors[0]?.message;
              return (
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-sm font-semibold">
                    Full name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    autoComplete="name"
                    className="h-11 rounded-sm px-3 text-sm"
                    value={field.state.value}
                    aria-required="true"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "name-error" : undefined}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                  {error ? (
                    <p id="name-error" role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      {error}
                    </p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>
        ) : null}

        <form.Field name="email">
          {(field) => {
            const error = field.state.meta.errors[0]?.message;
            return (
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-sm font-semibold">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="h-11 rounded-sm px-3 text-sm"
                  value={field.state.value}
                  aria-required="true"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "email-error" : undefined}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                {error ? (
                  <p id="email-error" role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {error}
                  </p>
                ) : null}
              </div>
            );
          }}
        </form.Field>

        <form.Field name="password">
          {(field) => {
            const error = field.state.meta.errors[0]?.message;
            return (
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-sm font-semibold">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="h-11 rounded-sm px-3 text-sm"
                  value={field.state.value}
                  aria-required="true"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "password-error" : "password-hint"}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                {error ? (
                  <p id="password-error" role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {error}
                  </p>
                ) : (
                  <p id="password-hint" className="text-sm text-muted-foreground">
                    At least 8 characters.
                  </p>
                )}
              </div>
            );
          }}
        </form.Field>

        <form.Subscribe
          selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full text-sm"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? text.pending : text.submit}
            </Button>
          )}
        </form.Subscribe>

        <p className="text-sm text-muted-foreground">
          {text.switchText}{" "}
          <Link
            href={text.switchHref}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {text.switchLabel}
          </Link>
        </p>
      </form>
    </div>
  );
}
