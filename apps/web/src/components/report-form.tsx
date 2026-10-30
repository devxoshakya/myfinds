"use client";

import { Button } from "@myfinds/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@myfinds/ui/components/card";
import { Input } from "@myfinds/ui/components/input";
import { Label } from "@myfinds/ui/components/label";
import { Textarea } from "@myfinds/ui/components/textarea";
import { cn } from "@myfinds/ui/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  Bolt,
  Check,
  ChevronRight,
  ImagePlus,
  LockKeyhole,
  MapPin,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { z } from "zod";

const categories = [
  "Phone",
  "Wallet",
  "Keys",
  "Bag",
  "ID card",
  "Laptop",
  "Headphones",
  "Clothing",
  "Other",
] as const;

const placeTypes = [
  { value: "METRO", label: "Metro" },
  { value: "RAILWAY", label: "Railway" },
  { value: "BUS_STOP", label: "Bus stop" },
] as const;

const custodyChoices = [
  {
    value: "FINDER",
    title: "I'll keep it and return it myself",
    detail:
      "Hold the item safely until the verified owner claims it with a secure handover code.",
  },
  {
    value: "STATION",
    title: "I'm handing it to a station or stop",
    detail:
      "That station becomes responsible for the item. Staff will confirm they received it.",
  },
] as const;

type PlaceType = (typeof placeTypes)[number]["value"];
type Custody = (typeof custodyChoices)[number]["value"];

type PlaceValue = {
  state: string;
  city: string;
  placeType: string;
  station: string;
  note: string;
};

type QuestionValue = {
  question: string;
  expectedAnswer: string;
};

type FormValues = {
  itemName: string;
  category: string;
  description: string;
  color: string;
  brand: string;
  date: string;
  time: string;
  place: PlaceValue;
  custody: Custody | "";
  handInPlace: PlaceValue;
  sameAsFound: boolean;
  questions: QuestionValue[];
};

type ReportFormProps = {
  kind: "lost" | "found";
};

type DemoPlace = {
  state: string;
  city: string;
  placeType: PlaceType;
  station: string;
};

const demoPlaces: DemoPlace[] = [
  {
    state: "Demo State",
    city: "Sample City",
    placeType: "METRO",
    station: "Sample Central Metro",
  },
  {
    state: "Demo State",
    city: "Sample City",
    placeType: "METRO",
    station: "Sample Riverside Metro",
  },
  {
    state: "Demo State",
    city: "Sample City",
    placeType: "RAILWAY",
    station: "Sample Central Railway",
  },
  {
    state: "Demo State",
    city: "Sample City",
    placeType: "BUS_STOP",
    station: "Sample Central Bus Stop",
  },
  {
    state: "Demo State",
    city: "Sample Coast City",
    placeType: "METRO",
    station: "Sample Coast Metro",
  },
  {
    state: "Demo State",
    city: "Sample Coast City",
    placeType: "RAILWAY",
    station: "Sample Coast Railway",
  },
  {
    state: "Example State",
    city: "Example City",
    placeType: "METRO",
    station: "Example Main Metro",
  },
  {
    state: "Example State",
    city: "Example City",
    placeType: "BUS_STOP",
    station: "Example Main Bus Stop",
  },
];

const emptyPlace = (): PlaceValue => ({
  state: "",
  city: "",
  placeType: "",
  station: "",
  note: "",
});

const currentDate = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

const placeSchema = z
  .object({
    state: z.string().min(1, "Choose a state."),
    city: z.string().min(1, "Choose a city."),
    placeType: z.string().min(1, "Choose a place type."),
    station: z.string().min(1, "Choose a station or stop."),
    note: z.string().max(120, "Use 120 characters or fewer."),
  })
  .superRefine((place, context) => {
    if (
      place.station &&
      !demoPlaces.some(
        (option) =>
          option.state === place.state &&
          option.city === place.city &&
          option.placeType === place.placeType &&
          option.station === place.station,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["station"],
        message: "Choose a station from the available options.",
      });
    }
  });

const commonSchema = z.object({
  itemName: z
    .string()
    .trim()
    .min(1, "Enter an item name.")
    .max(80, "Use 80 characters or fewer."),
  category: z.enum(categories, { error: "Choose a category." }),
  description: z.string().max(1000, "Use 1,000 characters or fewer."),
  color: z.string().max(80, "Use 80 characters or fewer."),
  brand: z.string().max(80, "Use 80 characters or fewer."),
  date: z
    .string()
    .min(1, "Choose a date.")
    .refine((value) => value <= currentDate(), "The date cannot be in the future."),
  time: z.string(),
  place: placeSchema,
});

const questionSchema = z.object({
  question: z.string().max(300, "Use 300 characters or fewer."),
  expectedAnswer: z.string().max(300, "Use 300 characters or fewer."),
});

const foundSchema = commonSchema
  .extend({
    custody: z.string().refine((value) => value === "FINDER" || value === "STATION", {
      message: "Choose how you will return the item.",
    }),
    handInPlace: placeSchema.optional(),
    questions: z.array(questionSchema).max(2, "Add no more than two questions."),
  })
  .superRefine((values, context) => {
    if (values.custody === "STATION" && !values.handInPlace) {
      context.addIssue({
        code: "custom",
        path: ["handInPlace"],
        message: "Add the station or stop where you handed in the item.",
      });
    }

    if (values.custody === "FINDER" && values.questions.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["questions"],
        message: "Add at least one question only the owner can answer.",
      });
    }

    values.questions.forEach((question, index) => {
      if (!question.question.trim() && !question.expectedAnswer.trim()) {
        return;
      }

      if (!question.question.trim()) {
        context.addIssue({
          code: "custom",
          path: ["questions", index, "question"],
          message: "Enter a verification question.",
        });
      }

      if (!question.expectedAnswer.trim()) {
        context.addIssue({
          code: "custom",
          path: ["questions", index, "expectedAnswer"],
          message: "Enter the expected answer.",
        });
      }
    });
  });

const inputClassName = "h-11 rounded-sm bg-background px-3 text-sm";
const selectClassName =
  "h-11 w-full rounded-sm border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-1 text-destructive">
      *
    </span>
  );
}

function FormField({
  id,
  label,
  required = false,
  optional = false,
  description,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  description?: string;
  error?: string;
  children: ReactNode;
}) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
        {required ? <RequiredMark /> : null}
        {optional ? <span className="ml-1 font-normal text-muted-foreground">(optional)</span> : null}
      </Label>
      {children}
      {description ? (
        <p id={descriptionId} className="text-sm leading-5 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SectionCard({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="bg-background">
      <CardHeader className="flex items-start gap-3 border-b border-border">
        <span className="flex size-8 shrink-0 items-center justify-center bg-primary font-mono text-sm font-semibold text-primary-foreground">
          {number}
        </span>
        <div className="grid gap-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 pt-4">{children}</CardContent>
    </Card>
  );
}

function PlacePicker({
  id,
  label,
  value,
  error,
  muted = false,
  onChange,
}: {
  id: string;
  label: string;
  value: PlaceValue;
  error?: string;
  muted?: boolean;
  onChange: (value: PlaceValue) => void;
}) {
  const states = [...new Set(demoPlaces.map((place) => place.state))];
  const cities = [
    ...new Set(
      demoPlaces.filter((place) => place.state === value.state).map((place) => place.city),
    ),
  ];
  const stations = demoPlaces.filter(
    (place) =>
      place.state === value.state &&
      place.city === value.city &&
      place.placeType === value.placeType,
  );
  const datalistId = `${id}-stations`;

  const update = (key: keyof PlaceValue, nextValue: string) => {
    if (key === "state") {
      onChange({ ...emptyPlace(), state: nextValue });
      return;
    }
    if (key === "city") {
      onChange({ ...value, city: nextValue, placeType: "", station: "" });
      return;
    }
    if (key === "placeType") {
      onChange({ ...value, placeType: nextValue, station: "" });
      return;
    }
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <fieldset
      className={cn("grid gap-4 border border-border p-4", muted ? "bg-muted/40" : "bg-card")}
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <legend className="px-1 text-sm font-semibold">
        {label}
        <RequiredMark />
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-state`} className="text-sm font-semibold">
            State
            <RequiredMark />
          </Label>
          <select
            id={`${id}-state`}
            className={selectClassName}
            value={value.state}
            aria-required="true"
            aria-invalid={Boolean(error && !value.state)}
            onChange={(event) => update("state", event.target.value)}
          >
            <option value="">Choose a state</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-city`} className="text-sm font-semibold">
            City
            <RequiredMark />
          </Label>
          <select
            id={`${id}-city`}
            className={selectClassName}
            value={value.city}
            disabled={!value.state}
            aria-required="true"
            aria-invalid={Boolean(error && !value.city)}
            onChange={(event) => update("city", event.target.value)}
          >
            <option value="">Choose a city</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-type`} className="text-sm font-semibold">
            Place type
            <RequiredMark />
          </Label>
          <select
            id={`${id}-type`}
            className={selectClassName}
            value={value.placeType}
            disabled={!value.city}
            aria-required="true"
            aria-invalid={Boolean(error && !value.placeType)}
            onChange={(event) => update("placeType", event.target.value)}
          >
            <option value="">Choose a place type</option>
            {placeTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-station`} className="text-sm font-semibold">
            Station or stop
            <RequiredMark />
          </Label>
          <Input
            id={`${id}-station`}
            className={inputClassName}
            list={datalistId}
            value={value.station}
            disabled={!value.placeType}
            placeholder="Search station (e.g. Sample Central)"
            aria-required="true"
            aria-invalid={Boolean(
              error && !stations.some((station) => station.station === value.station),
            )}
            onChange={(event) => update("station", event.target.value)}
          />
          <datalist id={datalistId}>
            {stations.map((station) => (
              <option key={station.station} value={station.station} />
            ))}
          </datalist>
        </div>
      </div>
      <FormField
        id={`${id}-note`}
        label="Platform, gate, or coach"
        optional
        description="Add a nearby landmark or platform to help narrow down the location."
      >
        <Input
          id={`${id}-note`}
          className={inputClassName}
          maxLength={120}
          value={value.note}
          onChange={(event) => update("note", event.target.value)}
        />
      </FormField>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Demo directory only. Live station options will come from the places service.
      </p>
    </fieldset>
  );
}

function TipCard({
  title,
  tips,
  footer,
}: {
  title: string;
  tips: string[];
  footer?: ReactNode;
}) {
  return (
    <Card className="bg-background">
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-9 items-center justify-center border border-border">
          <MapPin className="size-4" aria-hidden="true" />
        </span>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-4">
          {tips.map((tip, index) => (
            <li key={tip} className="flex gap-3 text-sm leading-5">
              <span className="font-mono text-xs text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{tip}</span>
            </li>
          ))}
        </ol>
        {footer ? <div className="mt-5 border-t border-border pt-4">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

function initialValues(): FormValues {
  return {
    itemName: "",
    category: "",
    description: "",
    color: "",
    brand: "",
    date: currentDate(),
    time: "",
    place: emptyPlace(),
    custody: "",
    handInPlace: emptyPlace(),
    sameAsFound: false,
    questions: [],
  };
}

export default function ReportForm({ kind }: ReportFormProps) {
  const isFound = kind === "found";
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [itemPhotos, setItemPhotos] = useState<File[]>([]);
  const [proofPhoto, setProofPhoto] = useState<File | null>(null);
  const [photoErrors, setPhotoErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const updateValue = <Key extends keyof FormValues>(key: Key, value: FormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      if (key === "custody") {
        delete next.questions;
        delete next.handInPlace;
      }
      return next;
    });
    setSubmitted(false);
  };

  const updatePlace = (key: "place" | "handInPlace", place: PlaceValue) => {
    setValues((current) => ({
      ...current,
      [key]: place,
      ...(key === "place" && current.sameAsFound ? { handInPlace: { ...place } } : {}),
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      if (key === "place" && values.sameAsFound) {
        delete next.handInPlace;
      }
      return next;
    });
    setSubmitted(false);
  };

  const handlePhotoChange = (
    event: ChangeEvent<HTMLInputElement>,
    photoKind: "itemPhotos" | "proofPhoto",
  ) => {
    setSubmitted(false);
    const selected = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    setPhotoErrors((current) => {
      const next = { ...current };
      delete next[photoKind];
      return next;
    });

    const invalidType = selected.find(
      (file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type),
    );
    if (invalidType) {
      setPhotoErrors((current) => ({
        ...current,
        [photoKind]: "Choose a JPEG, PNG, or WebP image.",
      }));
      return;
    }

    const tooLarge = selected.find((file) => file.size > 5 * 1024 * 1024);
    if (tooLarge) {
      setPhotoErrors((current) => ({ ...current, [photoKind]: "Each photo must be 5 MB or less." }));
      return;
    }

    if (photoKind === "proofPhoto") {
      setProofPhoto(selected[0] ?? null);
      return;
    }

    if (itemPhotos.length + selected.length > 4) {
      setPhotoErrors((current) => ({ ...current, itemPhotos: "Add no more than four item photos." }));
      return;
    }

    setItemPhotos((current) => [...current, ...selected]);
  };

  const removeItemPhoto = (index: number) => {
    setItemPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
    setPhotoErrors((current) => {
      const next = { ...current };
      delete next.itemPhotos;
      return next;
    });
    setSubmitted(false);
  };

  const toggleSamePlace = (checked: boolean) => {
    setValues((current) => ({
      ...current,
      sameAsFound: checked,
      handInPlace: checked ? { ...current.place } : emptyPlace(),
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next.handInPlace;
      return next;
    });
    setSubmitted(false);
  };

  const updateQuestion = (index: number, key: keyof QuestionValue, value: string) => {
    setValues((current) => {
      const questions = [...current.questions];
      while (questions.length <= index) {
        questions.push({ question: "", expectedAnswer: "" });
      }
      questions[index] = { ...questions[index], [key]: value };
      return { ...current, questions };
    });
    setErrors((current) => {
      const next = { ...current };
      delete next.questions;
      delete next[`questions.${index}.${key}`];
      return next;
    });
    setSubmitted(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (Object.keys(photoErrors).length > 0) {
      setSubmitted(false);
      return;
    }
    const result = isFound
      ? foundSchema.safeParse({
          itemName: values.itemName,
          category: values.category,
          description: values.description,
          color: values.color,
          brand: values.brand,
          date: values.date,
          time: values.time,
          place: values.place,
          custody: values.custody,
          handInPlace: values.custody === "STATION" ? values.handInPlace : undefined,
          questions: values.questions,
        })
      : commonSchema.safeParse({
          itemName: values.itemName,
          category: values.category,
          description: values.description,
          color: values.color,
          brand: values.brand,
          date: values.date,
          time: values.time,
          place: values.place,
        });

    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const [first, second, third] = issue.path.map(String);
        const key =
          first === "place" || first === "handInPlace"
            ? first
            : first === "questions" && second !== undefined && third !== undefined
              ? `questions.${second}.${third}`
              : first;
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      });
      setErrors(nextErrors);
      setSubmitted(false);
      return;
    }

    setErrors({});
    setSubmitted(true);
  };

  const isValuable =
    isFound && ["Phone", "Wallet", "ID card", "Laptop"].includes(values.category);
  const hasHandInPlace = isFound && values.custody === "STATION";
  const questionRows =
    values.questions.length > 0
      ? values.questions
      : isFound && values.custody === "FINDER"
        ? [{ question: "", expectedAnswer: "" }]
        : [];
  const itemSectionNumber = isFound ? 2 : 1;
  const locationSectionNumber = itemSectionNumber + 1;
  const handInSectionNumber = locationSectionNumber + 1;
  const photosSectionNumber = locationSectionNumber + (hasHandInPlace ? 2 : 1);
  const questionsSectionNumber = photosSectionNumber + 1;

  const sectionHeader = (
    <div className="mb-6">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-sm">
        <Link href="/" className="text-muted-foreground underline-offset-4 hover:underline">
          Home
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        <span aria-current="page" className="font-medium">
          Report a {kind} item
        </span>
      </nav>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Report a {kind} item
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
        {isFound
          ? "Thank you for helping. Tell us what you found and what you'll do with it."
          : "The more detail you add, the better the match."}
      </p>
      <div
        role="note"
        className="mt-5 flex items-start gap-3 border border-border bg-background px-4 py-3 text-sm leading-5"
      >
        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center bg-muted">
          <Check className="size-3.5" aria-hidden="true" />
        </span>
        <p>
          Preview mode: the form validates in your browser, but reports are not saved yet.
        </p>
      </div>
    </div>
  );

  return (
    <main className="min-h-0 overflow-y-auto bg-muted/40">
      <form noValidate onSubmit={handleSubmit}>
        <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          {sectionHeader}

          <div className="grid items-start gap-6 lg:grid-cols-12">
            <div className="grid gap-5 lg:col-span-8">
              {isFound ? (
                <SectionCard
                  number={1}
                  title="What will you do with it?"
                  description="Choose who will keep the item safe while its owner is verified."
                >
                  <fieldset aria-describedby={errors.custody ? "custody-error" : undefined}>
                    <legend className="sr-only">Choose item custody</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {custodyChoices.map((choice) => (
                        <label
                          key={choice.value}
                          className={cn(
                            "flex cursor-pointer gap-3 border-2 p-4 transition-colors",
                            values.custody === choice.value
                              ? "border-foreground bg-muted/40"
                              : "border-border bg-background hover:border-foreground/60",
                          )}
                        >
                          <input
                            type="radio"
                            name="custody"
                            value={choice.value}
                            checked={values.custody === choice.value}
                            aria-invalid={Boolean(errors.custody)}
                            aria-describedby={errors.custody ? "custody-error" : undefined}
                            onChange={() => updateValue("custody", choice.value)}
                            className="mt-1 size-4 accent-foreground"
                          />
                          <span>
                            <span className="block text-sm font-semibold">{choice.title}</span>
                            <span className="mt-2 block text-sm leading-5 text-muted-foreground">
                              {choice.detail}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                    {errors.custody ? (
                      <p id="custody-error" className="mt-2 text-sm text-destructive" role="alert">
                        {errors.custody}
                      </p>
                    ) : null}
                  </fieldset>
                  {isValuable ? (
                    <div
                      role="note"
                      className="flex items-start gap-3 border border-border bg-muted/40 p-3 text-sm leading-5"
                    >
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <p>We recommend handing valuables to a station.</p>
                    </div>
                  ) : null}
                </SectionCard>
              ) : null}

              <SectionCard number={itemSectionNumber} title={isFound ? "What did you find?" : "What did you lose?"}>
                {isFound ? (
                  <div
                    role="note"
                    className="flex items-start gap-3 border border-border bg-muted/40 p-3 text-sm leading-5"
                  >
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <p>Don't type card numbers, passport details, or ID numbers here.</p>
                  </div>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FormField
                      id="itemName"
                      label="Item name"
                      required
                      error={errors.itemName}
                    >
                      <Input
                        id="itemName"
                        className={inputClassName}
                        maxLength={80}
                        placeholder="Black leather wallet"
                        value={values.itemName}
                        aria-required="true"
                        aria-invalid={Boolean(errors.itemName)}
                        aria-describedby={errors.itemName ? "itemName-error" : undefined}
                        onChange={(event) => updateValue("itemName", event.target.value)}
                      />
                    </FormField>
                  </div>
                  <FormField
                    id="category"
                    label="Category"
                    required
                    error={errors.category}
                  >
                    <select
                      id="category"
                      className={selectClassName}
                      value={values.category}
                      aria-required="true"
                      aria-invalid={Boolean(errors.category)}
                      aria-describedby={errors.category ? "category-error" : undefined}
                      onChange={(event) => updateValue("category", event.target.value)}
                    >
                      <option value="">Choose a category</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <div className="sm:col-span-2">
                    <FormField
                      id="description"
                      label="Description"
                      optional
                      description={
                        isFound
                          ? "Describe visible details only. Do not include private numbers or codes."
                          : "Marks, stickers, what was inside"
                      }
                      error={errors.description}
                    >
                      <Textarea
                        id="description"
                        className="min-h-24 resize-y rounded-sm bg-background px-3 py-2 text-sm"
                        maxLength={1000}
                        value={values.description}
                        aria-invalid={Boolean(errors.description)}
                        aria-describedby={
                          errors.description ? "description-error" : "description-description"
                        }
                        onChange={(event) => updateValue("description", event.target.value)}
                      />
                    </FormField>
                  </div>
                  <FormField id="color" label="Color" optional error={errors.color}>
                    <Input
                      id="color"
                      className={inputClassName}
                      maxLength={80}
                      value={values.color}
                      aria-invalid={Boolean(errors.color)}
                      aria-describedby={errors.color ? "color-error" : undefined}
                      onChange={(event) => updateValue("color", event.target.value)}
                    />
                  </FormField>
                  <FormField id="brand" label="Brand" optional error={errors.brand}>
                    <Input
                      id="brand"
                      className={inputClassName}
                      maxLength={80}
                      value={values.brand}
                      aria-invalid={Boolean(errors.brand)}
                      aria-describedby={errors.brand ? "brand-error" : undefined}
                      onChange={(event) => updateValue("brand", event.target.value)}
                    />
                  </FormField>
                </div>
              </SectionCard>

              <SectionCard
                number={locationSectionNumber}
                title="Where and when?"
                description={isFound ? "Where did you find it?" : "Where did you lose it?"}
              >
                <PlacePicker
                  id="place"
                  label={isFound ? "Where did you find it?" : "Where did you lose it?"}
                  value={values.place}
                  error={errors.place}
                  muted={isFound}
                  onChange={(place) => updatePlace("place", place)}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    id="date"
                    label={isFound ? "Date found" : "Date lost"}
                    required
                    error={errors.date}
                  >
                    <Input
                      id="date"
                      type="date"
                      max={currentDate()}
                      className={inputClassName}
                      value={values.date}
                      aria-required="true"
                      aria-invalid={Boolean(errors.date)}
                      aria-describedby={errors.date ? "date-error" : undefined}
                      onChange={(event) => updateValue("date", event.target.value)}
                    />
                  </FormField>
                  <FormField id="time" label="Approximate time" optional>
                    <Input
                      id="time"
                      type="time"
                      className={inputClassName}
                      value={values.time}
                      onChange={(event) => updateValue("time", event.target.value)}
                    />
                  </FormField>
                </div>
              </SectionCard>

              {hasHandInPlace ? (
                <SectionCard
                  number={handInSectionNumber}
                  title="Where did you hand it in?"
                  description="Choose the station or stop that will take custody."
                >
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-5">
                    <input
                      type="checkbox"
                      checked={values.sameAsFound}
                      onChange={(event) => toggleSamePlace(event.target.checked)}
                      className="mt-0.5 size-4 shrink-0 accent-foreground"
                    />
                    <span>Same as where I found it</span>
                  </label>
                  {!values.sameAsFound ? (
                    <PlacePicker
                      id="handInPlace"
                      label="Station or stop where you handed it in"
                      value={values.handInPlace}
                      error={errors.handInPlace}
                      muted
                      onChange={(place) => updatePlace("handInPlace", place)}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      The hand-in location follows the place selected above.
                    </p>
                  )}
                  {errors.handInPlace && values.sameAsFound ? (
                    <p className="text-sm text-destructive">{errors.handInPlace}</p>
                  ) : null}
                </SectionCard>
              ) : null}

              <SectionCard number={photosSectionNumber} title="Photos" description="Optional">
                <FormField
                  id="item-photos"
                  label={isFound ? "Item photos" : "Add photos"}
                  optional
                  description={
                    isFound
                      ? "Shown only to the person whose claim matches. Hide sensitive labels or names."
                      : "A photo of a similar item, or an older photo of yours, helps."
                  }
                  error={photoErrors.itemPhotos}
                >
                  <label
                    htmlFor="item-photos"
                    className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border bg-muted/30 p-5 text-center outline-none transition-colors hover:bg-muted/60 focus-within:ring-2 focus-within:ring-ring"
                  >
                    <ImagePlus className="size-6" aria-hidden="true" />
                    <span className="text-sm font-medium">Add photos</span>
                    <span className="text-xs text-muted-foreground">
                      JPEG, PNG, or WebP · up to 5 MB each · maximum 4
                    </span>
                    <Input
                      id="item-photos"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="sr-only"
                      aria-describedby={
                        photoErrors.itemPhotos ? "item-photos-error" : "item-photos-description"
                      }
                      aria-invalid={Boolean(photoErrors.itemPhotos)}
                      onChange={(event) => handlePhotoChange(event, "itemPhotos")}
                    />
                  </label>
                </FormField>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p aria-live="polite">Attached: {itemPhotos.length} of 4</p>
                  <p className="text-muted-foreground">Files stay in this browser preview.</p>
                </div>
                {itemPhotos.length > 0 ? (
                  <ul aria-label="Attached item photos" className="grid gap-2 sm:grid-cols-2">
                    {itemPhotos.map((photo, index) => (
                      <li
                        key={`${photo.name}-${photo.lastModified}-${index}`}
                        className="flex min-w-0 items-center justify-between gap-3 border border-border bg-background px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate">{photo.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${photo.name}`}
                          onClick={() => removeItemPhoto(index)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {isFound ? (
                  <div className="grid gap-3 border-t border-border pt-4">
                    <FormField
                      id="proof-photo"
                      label="Private proof photo"
                      optional
                      description="A close-up of something only the owner would know. It is never shown to the person claiming the item."
                      error={photoErrors.proofPhoto}
                    >
                      <label
                        htmlFor="proof-photo"
                        className="flex min-h-20 cursor-pointer items-center gap-3 border border-dashed border-border bg-muted/30 px-4 py-3 outline-none hover:bg-muted/60 focus-within:ring-2 focus-within:ring-ring"
                      >
                        <LockKeyhole className="size-5 shrink-0" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">
                            {proofPhoto ? proofPhoto.name : "Upload private verification proof"}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            JPEG, PNG, or WebP · up to 5 MB
                          </span>
                        </span>
                        <Input
                          id="proof-photo"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          aria-invalid={Boolean(photoErrors.proofPhoto)}
                          aria-describedby={
                            photoErrors.proofPhoto
                              ? "proof-photo-error"
                              : "proof-photo-description"
                          }
                          onChange={(event) => handlePhotoChange(event, "proofPhoto")}
                        />
                      </label>
                    </FormField>
                    {proofPhoto ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="justify-start"
                        onClick={() => {
                          setProofPhoto(null);
                          setSubmitted(false);
                        }}
                      >
                        <Trash2 data-icon="inline-start" />
                        Remove private photo
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </SectionCard>

              {isFound ? (
                <SectionCard
                  number={questionsSectionNumber}
                  title="Questions only the owner can answer"
                  description="Set one or two questions. If you hand the item to a station, these are optional because staff can add them."
                >
                  {values.custody === "FINDER" || questionRows.length > 0 ? (
                    <div className="grid gap-4">
                      {questionRows.map((question, index) => (
                        <fieldset
                          key={index}
                          className="grid gap-4 border border-border p-4"
                          aria-describedby={errors.questions ? "questions-error" : undefined}
                        >
                          <legend className="px-1 text-sm font-semibold">
                            Question {index + 1}
                            {values.custody === "FINDER" ? <RequiredMark /> : null}
                          </legend>
                          <FormField
                            id={`question-${index}`}
                            label="Question"
                            required={values.custody === "FINDER"}
                            error={errors[`questions.${index}.question`]}
                          >
                            <Input
                              id={`question-${index}`}
                              className={inputClassName}
                              maxLength={300}
                              placeholder="What is the lock screen wallpaper?"
                              value={question.question}
                              aria-required={values.custody === "FINDER"}
                              aria-invalid={Boolean(errors[`questions.${index}.question`])}
                              onChange={(event) =>
                                updateQuestion(index, "question", event.target.value)
                              }
                            />
                          </FormField>
                          <FormField
                            id={`expected-answer-${index}`}
                            label="Expected answer"
                            required={values.custody === "FINDER"}
                            description="Only you and station staff can see this. Never shown to people claiming it."
                            error={errors[`questions.${index}.expectedAnswer`]}
                          >
                            <Input
                              id={`expected-answer-${index}`}
                              className={inputClassName}
                              maxLength={300}
                              value={question.expectedAnswer}
                              aria-required={values.custody === "FINDER"}
                              aria-invalid={Boolean(errors[`questions.${index}.expectedAnswer`])}
                              onChange={(event) =>
                                updateQuestion(index, "expectedAnswer", event.target.value)
                              }
                            />
                          </FormField>
                          {values.custody === "STATION" ? (
                            <Button
                              type="button"
                              variant="link"
                              className="justify-start px-0"
                              onClick={() => {
                                setValues((current) => ({
                                  ...current,
                                  questions: current.questions.filter(
                                    (_, questionIndex) => questionIndex !== index,
                                  ),
                                }));
                                setErrors((current) => {
                                  const next = { ...current };
                                  delete next.questions;
                                  delete next[`questions.${index}.question`];
                                  delete next[`questions.${index}.expectedAnswer`];
                                  return next;
                                });
                                setSubmitted(false);
                              }}
                            >
                              Remove question {index + 1}
                            </Button>
                          ) : null}
                        </fieldset>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Choose a custody option to see whether a verification question is required.
                    </p>
                  )}
                  {errors.questions ? (
                    <p id="questions-error" className="text-sm text-destructive" role="alert">
                      {errors.questions}
                    </p>
                  ) : null}
                  {values.questions.length < 2 ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-fit"
                      disabled={!values.custody}
                      onClick={() => {
                        setValues((current) => ({
                          ...current,
                          questions: [
                            ...current.questions,
                            { question: "", expectedAnswer: "" },
                          ],
                        }));
                        setErrors((current) => {
                          const next = { ...current };
                          delete next.questions;
                          return next;
                        });
                        setSubmitted(false);
                      }}
                    >
                      <Plus data-icon="inline-start" />
                      Add a question
                    </Button>
                  ) : null}
                </SectionCard>
              ) : (
                <SectionCard
                  number={4}
                  title="Your contact"
                  description="Your contact information is never shown publicly."
                >
                  <div className="grid gap-3">
                    {["Verified phone", "Verified email"].map((contact) => (
                      <div
                        key={contact}
                        className="flex flex-col gap-2 border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium">{contact}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Added from your verified account when connected
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <LockKeyhole className="size-3.5" aria-hidden="true" />
                          Read only
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="flex items-start gap-2 text-sm leading-5 text-muted-foreground">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    Shared only after your claim is approved.
                  </p>
                </SectionCard>
              )}
            </div>

            <aside className="grid gap-4 lg:col-span-4">
              <TipCard
                title={isFound ? "Tips for finders" : "Tips for better matches"}
                tips={
                  isFound
                    ? [
                        "Protect private data; do not include ID or card numbers.",
                        "Note the exact platform, gate, or coach.",
                        "Pick a secret question about a detail not visible from outside.",
                      ]
                    : [
                        "Be specific about color and brand.",
                        "Choose the station where you think you lost it.",
                        "Add a photo if you can.",
                      ]
                }
                footer={
                  isFound ? (
                    <div className="flex items-start gap-3 text-sm leading-5">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <p>
                        When you hand an item to a station, its staff take custody. Every step is
                        logged.
                      </p>
                    </div>
                  ) : null
                }
              />
              {isFound ? (
                <Card className="bg-background">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <span className="flex size-9 items-center justify-center border border-border">
                      <LockKeyhole className="size-4" aria-hidden="true" />
                    </span>
                    <CardTitle className="text-base">Protect the owner’s privacy</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm leading-5 text-muted-foreground">
                    Item photos are shared only with a matched owner. Private proof is never shown
                    to a claimant.
                  </CardContent>
                </Card>
              ) : null}
            </aside>
          </div>

          {submitted ? (
            <div
              role="status"
              aria-live="polite"
              className="mx-auto mt-6 flex max-w-6xl items-start gap-3 border border-foreground bg-background p-4 text-sm leading-5"
            >
              <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Your report is ready.</p>
                <p className="mt-1 text-muted-foreground">
                  This preview validated the form, but no report was saved because report submission
                  is not connected yet.
                </p>
              </div>
            </div>
          ) : null}
          {Object.keys(errors).length > 0 ? (
            <p className="sr-only" role="alert" aria-live="assertive">
              There are errors in the form. Review the messages next to the affected fields.
            </p>
          ) : null}
        </div>

        <div className="sticky bottom-0 border-t border-border bg-background/95 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bolt className="size-4 shrink-0" aria-hidden="true" />
              {isFound
                ? "We search for matches as soon as the item is available."
                : "We search for matches right away and email you."}
            </p>
            <div className="flex items-center justify-end gap-3">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center px-3 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
                Cancel
              </Link>
              <Button type="submit" size="lg" className="h-11 px-5 text-sm">
                Submit report
              </Button>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
