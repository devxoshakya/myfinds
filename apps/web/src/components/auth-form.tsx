"use client";

import { Button } from "@myfinds/ui/components/button";
import { Input } from "@myfinds/ui/components/input";
import { Label } from "@myfinds/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { AlertCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
  nextPath?: string;
};

/** Internal paths only, so a crafted `next` cannot bounce users off-site. */
function safeNextPath(value?: string) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/login") &&
    !value.startsWith("/signup")
    ? value
    : "/reports";
}

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
    description: "Create an account to report a lost or found item.",
    submit: "Create account",
    pending: "Creating account…",
    switchText: "Already have an account?",
    switchLabel: "Log in",
    switchHref: "/login" as const,
  },
};

export default function AuthForm({ mode, nextPath }: AuthFormProps) {
  const router = useRouter();
  const redirectTo = safeNextPath(nextPath);
  const text = copy[mode];
  const schema = useMemo(() => schemaFor(mode), [mode]);
  const [activeField, setActiveField] = useState<"name" | "email" | "password" | null>(null);

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
              router.push(redirectTo as Route);
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
            router.push(redirectTo as Route);
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
    <div className="mf-auth">
      <aside className="mf-auth__aside" aria-label="MyFinds account benefits">
        <p className="mf-eyebrow">Private lost &amp; found</p>
        <h2>
          Your account.
          <br />
          <em>One secure record.</em>
        </h2>
        <p className="mf-auth__aside-copy">
          Save reports, verify ownership and follow every handover from one private account.
        </p>
        <div className="mf-auth__stage" data-active={activeField ?? "none"}>
          <div className="mf-auth__stage-chrome">
            <span aria-hidden />
            <span aria-hidden />
            <span aria-hidden />
            <p>myfinds.local/account</p>
            <LockKeyhole size={10} strokeWidth={1.8} aria-hidden />
          </div>
          <div className="mf-auth__stage-body">
            <div className="mf-auth__stage-head">
              <span className="mf-auth__stage-icon" aria-hidden>
                <ShieldCheck size={16} strokeWidth={1.8} />
              </span>
              <div>
                <p>{activeField === "password" ? "Protecting your account" : "Secure account setup"}</p>
                <strong>
                  {activeField === "name"
                    ? "Identity confirmed"
                    : activeField === "email"
                      ? "Contact details sealed"
                      : activeField === "password"
                        ? "Password protection"
                        : "Private by default"}
                </strong>
              </div>
              <span className="mf-auth__stage-live">Live</span>
            </div>
            <ol className="mf-auth__steps">
              <li data-active={activeField === "name" || !activeField || undefined}>
                <span>{mode === "signup" ? "01" : "01"}</span>
                <div>
                  <strong>{mode === "signup" ? "Identity" : "Recognise"}</strong>
                  <em>{mode === "signup" ? "Name your account" : "Find your account"}</em>
                </div>
              </li>
              <li data-active={activeField === "email" || undefined}>
                <span>02</span>
                <div>
                  <strong>Contact</strong>
                  <em>{activeField === "email" ? "Email being sealed" : "Private to you"}</em>
                </div>
              </li>
              <li data-active={activeField === "password" || undefined}>
                <span>03</span>
                <div>
                  <strong>Access</strong>
                  <em>{activeField === "password" ? "Strengthen sign-in" : "Secure sign-in"}</em>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </aside>

      <div className="mf-auth__panel">
        <div className="mf-auth__heading">
          <span className="mf-auth__mark" aria-hidden>MF</span>
          <div>
            <h1>{text.title}</h1>
            <p>{text.description}</p>
          </div>
        </div>

        <form
        noValidate
        className="mf-auth__form"
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
                  <Label htmlFor="name" className="mf-auth__label">
                    Full name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Aarav Sharma"
                    autoComplete="name"
                    className="mf-auth__input"
                    value={field.state.value}
                    aria-required="true"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "name-error" : undefined}
                    onFocus={() => setActiveField("name")}
                    onBlur={() => {
                      setActiveField(null);
                      field.handleBlur();
                    }}
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
                <Label htmlFor="email" className="mf-auth__label">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="mf-auth__input"
                  value={field.state.value}
                  aria-required="true"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "email-error" : undefined}
                  onFocus={() => setActiveField("email")}
                  onBlur={() => {
                    setActiveField(null);
                    field.handleBlur();
                  }}
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
                <Label htmlFor="password" className="mf-auth__label">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="mf-auth__input"
                  value={field.state.value}
                  aria-required="true"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "password-error" : "password-hint"}
                  onFocus={() => setActiveField("password")}
                  onBlur={() => {
                    setActiveField(null);
                    field.handleBlur();
                  }}
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
              className="mf-auth__submit"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? text.pending : text.submit}
            </Button>
          )}
        </form.Subscribe>

        <p className="mf-auth__switch">
          {text.switchText}{" "}
          <Link
            href={`${text.switchHref}?next=${encodeURIComponent(redirectTo)}` as Route}
          >
            {text.switchLabel}
          </Link>
        </p>
        </form>
      </div>
    </div>
  );
}
