"use client";

import { Button } from "@myfinds/ui/components/button";
import { Input } from "@myfinds/ui/components/input";
import { Textarea } from "@myfinds/ui/components/textarea";
import { cn } from "@myfinds/ui/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Bolt,
  Check,
  ChevronRight,
  Info,
  Lightbulb,
  LockKeyhole,
  Plus,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";

import { FormField, RequiredMark, SectionCard } from "./fields";
import { PhotoUploader, PrivatePhotoUploader } from "./photo-uploader";
import { PlacePicker } from "./place-picker";
import {
  categories,
  currentDate,
  custodyChoices as custodyOptions,
  emptyPlace,
  fieldIdForPath,
  foundSchema,
  inputClassName,
  lostSchema,
  selectClassName,
  type FormValues,
  type QuestionValue,
} from "./schema";

type ReportFormProps = {
  kind: "lost" | "found";
};

const valuableCategories = ["Phone", "Wallet", "ID card", "Laptop"];

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

  const clearError = (key: string) => {
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const updateValue = <Key extends keyof FormValues>(key: Key, value: FormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
    clearError(key);
    if (key === "custody") {
      clearError("questions");
      clearError("handInPlace");
    }
    setSubmitted(false);
  };

  const updatePlace = (key: "place" | "handInPlace", place: FormValues["place"]) => {
    setValues((current) => ({
      ...current,
      [key]: place,
      ...(key === "place" && current.sameAsFound ? { handInPlace: { ...place } } : {}),
    }));
    clearError(key);
    if (key === "place" && values.sameAsFound) clearError("handInPlace");
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

    if (selected.length === 0) return;

    if (selected.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setPhotoErrors((current) => ({
        ...current,
        [photoKind]: "Choose a JPEG, PNG, or WebP image.",
      }));
      return;
    }

    if (selected.some((file) => file.size > 5 * 1024 * 1024)) {
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
    clearError("handInPlace");
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
    clearError("questions");
    clearError(`questions.${index}.${key}`);
    setSubmitted(false);
  };

  const addQuestion = () => {
    setValues((current) => {
      const seed =
        current.questions.length === 0 && current.custody === "FINDER"
          ? [{ question: "", expectedAnswer: "" }]
          : current.questions;
      return { ...current, questions: [...seed, { question: "", expectedAnswer: "" }] };
    });
    clearError("questions");
    setSubmitted(false);
  };

  const removeQuestion = (index: number) => {
    setValues((current) => ({
      ...current,
      questions: current.questions.filter((_, questionIndex) => questionIndex !== index),
    }));
    clearError("questions");
    setSubmitted(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (Object.keys(photoErrors).length > 0) {
      setSubmitted(false);
      return;
    }

    const payload = {
      itemName: values.itemName,
      category: values.category,
      description: values.description,
      color: values.color,
      brand: values.brand,
      date: values.date,
      time: values.time,
      place: values.place,
    };

    const result = isFound
      ? foundSchema.safeParse({
          ...payload,
          custody: values.custody,
          handInPlace: values.custody === "STATION" ? values.handInPlace : undefined,
          questions: values.questions,
        })
      : lostSchema.safeParse(payload);

    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      let focusId: string | undefined;

      result.error.issues.forEach((issue) => {
        const first = issue.path.length > 0 ? String(issue.path[0]) : "form";
        if (!nextErrors[first]) nextErrors[first] = issue.message;
        focusId ??= fieldIdForPath(
          issue.path.map((segment) => (typeof segment === "number" ? segment : String(segment))),
        );
      });

      setErrors(nextErrors);
      setSubmitted(false);

      const idToFocus = focusId;
      if (idToFocus) {
        requestAnimationFrame(() => {
          const field = document.getElementById(idToFocus);
          field?.focus();
          field?.scrollIntoView({ block: "center", behavior: "smooth" });
        });
      }
      return;
    }

    setErrors({});
    setPhotoErrors({});
    setSubmitted(true);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const isValuable = isFound && valuableCategories.includes(values.category);
  const hasHandInPlace = isFound && values.custody === "STATION";
  const questionRows =
    values.questions.length > 0
      ? values.questions
      : isFound && values.custody === "FINDER"
        ? [{ question: "", expectedAnswer: "" }]
        : [];

  let sectionNumber = 1;
  const custodySection = isFound ? sectionNumber++ : 0;
  const itemSection = sectionNumber++;
  const placeSection = sectionNumber++;
  const handInSection = hasHandInPlace ? sectionNumber++ : 0;
  const photosSection = sectionNumber++;
  const questionsSection = isFound ? sectionNumber++ : 0;
  const contactSection = isFound ? 0 : sectionNumber++;

  const errorCount = Object.keys(errors).length + Object.keys(photoErrors).length;

  return (
    <div className="mx-auto w-full max-w-[70rem] px-4 pt-6 pb-24 sm:px-6 sm:pt-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-sm">
        <Link href="/" className="text-muted-foreground underline-offset-4 hover:underline">
          Home
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        <span aria-current="page" className="font-medium">
          Report a {kind} item
        </span>
      </nav>

      <h1 className="text-[1.625rem] leading-8 font-semibold tracking-tight sm:text-[2rem] sm:leading-10">
        Report a {kind} item
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
        {isFound
          ? "Thank you for helping. Tell us what you found and what you'll do with it."
          : "The more detail you add, the better the match."}
      </p>

      <div className="mt-5 flex items-start gap-3 border border-border bg-surface-muted px-4 py-3 text-sm leading-5">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          Preview build: answers are checked in your browser, but reports are not saved yet.
        </p>
      </div>

      {submitted ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 flex items-start gap-3 border border-success/40 bg-success-bg p-4 text-sm leading-5 text-success"
        >
          <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">Your report is ready.</span> Saving reports arrives with
            the reports service. Your answers stay on this page.
          </p>
        </div>
      ) : null}

      {errorCount > 0 ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 border border-destructive/40 bg-danger-bg p-4 text-sm leading-5 text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">
              Check {errorCount === 1 ? "1 field" : `${errorCount} fields`}.
            </span>{" "}
            Messages are next to each field.
          </p>
        </div>
      ) : null}

      <form noValidate onSubmit={handleSubmit} className="mt-6">
        <div className="grid items-start gap-6 lg:grid-cols-12">
          <div className="grid gap-4 lg:col-span-8">
            {isFound ? (
              <SectionCard
                number={custodySection}
                title="What will you do with it?"
                description="Choose who will keep the item safe while its owner is verified."
              >
                <fieldset aria-describedby={errors.custody ? "custody-error" : undefined}>
                  <legend className="sr-only">Choose item custody</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {custodyOptions.map((choice) => (
                      <label
                        key={choice.value}
                        className={cn(
                          "flex cursor-pointer gap-3 border-2 p-4 transition-colors",
                          values.custody === choice.value
                            ? "border-foreground bg-card"
                            : "border-border bg-card hover:border-foreground/50",
                        )}
                      >
                        <input
                          type="radio"
                          id={`custody-${choice.value.toLowerCase()}`}
                          name="custody"
                          value={choice.value}
                          checked={values.custody === choice.value}
                          aria-invalid={Boolean(errors.custody)}
                          aria-describedby={errors.custody ? "custody-error" : undefined}
                          onChange={() => updateValue("custody", choice.value)}
                          className="mt-1 size-4 shrink-0 accent-foreground"
                        />
                        <span>
                          <span className="block text-sm font-semibold">{choice.title}</span>
                          <span className="mt-1.5 block text-sm leading-5 text-muted-foreground">
                            {choice.detail}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.custody ? (
                    <p id="custody-error" role="alert" className="mt-2 text-sm text-destructive">
                      {errors.custody}
                    </p>
                  ) : null}
                </fieldset>
                {isValuable ? (
                  <div className="flex items-start gap-3 border border-warning/40 bg-warning-bg p-3 text-sm leading-5 text-warning">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <p>We recommend handing valuables to a station.</p>
                  </div>
                ) : null}
              </SectionCard>
            ) : null}

            <SectionCard
              number={itemSection}
              title={isFound ? "What did you find?" : "What did you lose?"}
            >
              {isFound ? (
                <div className="flex items-start gap-3 border border-warning/40 bg-warning-bg p-3 text-sm leading-5 text-warning">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <p>Don't type card numbers, passport details, or ID numbers here.</p>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="itemName"
                  label="Item name"
                  required
                  error={errors.itemName}
                  className="sm:col-span-2"
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

                <FormField id="category" label="Category" required error={errors.category}>
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

                <FormField
                  id="description"
                  label="Description"
                  optional
                  error={errors.description}
                  description={
                    isFound
                      ? "Visible details only. Do not include private numbers or codes."
                      : "Marks, stickers, what was inside"
                  }
                >
                  <Textarea
                    id="description"
                    className="min-h-24 resize-y rounded-sm border-input bg-card px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
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
            </SectionCard>

            <SectionCard
              number={placeSection}
              title="Where and when?"
              description={isFound ? "Where did you find it?" : "Where did you lose it?"}
            >
              <PlacePicker
                id="place"
                label={isFound ? "Where did you find it?" : "Where did you lose it?"}
                value={values.place}
                error={errors.place}
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

            {handInSection > 0 ? (
              <SectionCard
                number={handInSection}
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

                {values.sameAsFound ? (
                  <p className="text-sm text-muted-foreground">
                    The hand-in location follows the place selected above.
                  </p>
                ) : (
                  <PlacePicker
                    id="handInPlace"
                    label="Station or stop where you handed it in"
                    value={values.handInPlace}
                    error={errors.handInPlace}
                    onChange={(place) => updatePlace("handInPlace", place)}
                  />
                )}
              </SectionCard>
            ) : null}

            <SectionCard number={photosSection} title="Photos">
              <PhotoUploader
                id="item-photos"
                label={isFound ? "Item photos" : "Add photos"}
                description={
                  isFound
                    ? "Shown only to the person whose claim matches. Hide sensitive labels or names."
                    : "A photo of a similar item, or an older photo of yours, helps."
                }
                files={itemPhotos}
                max={4}
                error={photoErrors.itemPhotos}
                onChange={(event) => handlePhotoChange(event, "itemPhotos")}
                onRemove={removeItemPhoto}
              />

              {isFound ? (
                <div className="border-t border-border pt-5">
                  <PrivatePhotoUploader
                    id="proof-photo"
                    file={proofPhoto}
                    error={photoErrors.proofPhoto}
                    onChange={(event) => handlePhotoChange(event, "proofPhoto")}
                    onRemove={() => {
                      setProofPhoto(null);
                      setSubmitted(false);
                    }}
                  />
                </div>
              ) : null}
            </SectionCard>

            {isFound ? (
              <SectionCard
                number={questionsSection}
                title="Questions only the owner can answer"
                description="Set one or two questions. If you hand the item to a station, these are optional because staff can add them."
              >
                {values.custody === "" ? (
                  <p className="text-sm text-muted-foreground">
                    Choose a custody option to see whether a question is required.
                  </p>
                ) : null}

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
                        aria-describedby={
                          errors[`questions.${index}.question`]
                            ? `question-${index}-error`
                            : undefined
                        }
                        onChange={(event) => updateQuestion(index, "question", event.target.value)}
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
                        aria-describedby={
                          errors[`questions.${index}.expectedAnswer`]
                            ? `expected-answer-${index}-error`
                            : `expected-answer-${index}-description`
                        }
                        onChange={(event) =>
                          updateQuestion(index, "expectedAnswer", event.target.value)
                        }
                      />
                    </FormField>

                    {values.custody === "STATION" && questionRows.length > 1 ? (
                      <Button
                        type="button"
                        variant="link"
                        className="w-fit px-0"
                        onClick={() => removeQuestion(index)}
                      >
                        Remove question {index + 1}
                      </Button>
                    ) : null}
                  </fieldset>
                ))}

                {errors.questions ? (
                  <p id="questions-error" role="alert" className="text-sm text-destructive">
                    {errors.questions}
                  </p>
                ) : null}

                {values.questions.length < 2 && values.custody !== "" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-fit border-foreground"
                    onClick={addQuestion}
                  >
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    Add a question
                  </Button>
                ) : null}
              </SectionCard>
            ) : (
              <SectionCard
                number={contactSection}
                title="Your contact"
                description="Your contact information is never shown publicly."
              >
                <div className="grid gap-3">
                  {["Verified phone", "Verified email"].map((contact) => (
                    <div
                      key={contact}
                      className="flex flex-col gap-2 border border-border bg-surface-muted p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{contact}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          Taken from your account
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
            />
            <div className="border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center border border-border">
                  <LockKeyhole className="size-4" aria-hidden="true" />
                </span>
                <h2 className="text-base font-semibold">
                  {isFound ? "Protect the owner's privacy" : "Who sees your report"}
                </h2>
              </div>
              <p className="mt-3 text-sm leading-5 text-muted-foreground">
                {isFound
                  ? "Item photos are shared only with a matched owner. Private proof is never shown to a claimant."
                  : "Only you, station staff, and the custodian of a matched found item can see your report."}
              </p>
            </div>
            {isFound ? (
              <div className="border border-border bg-card p-5">
                <h2 className="text-base font-semibold">Chain of custody</h2>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">
                  When you hand an item to a station, its staff become responsible for it. They
                  confirm receipt and every step is logged.
                </p>
              </div>
            ) : null}
          </aside>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur">
          <div className="mx-auto flex w-full max-w-[70rem] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bolt className="size-4 shrink-0" aria-hidden="true" />
              {isFound
                ? "We search for matches as soon as the item is available."
                : "We search for matches right away and email you."}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
              <Button
                variant="outline"
                className="h-11 border-foreground"
                render={<Link href="/" />}
                nativeButton={false}
              >
                <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                Cancel
              </Button>
              <Button type="submit" className="h-11 px-5 text-sm">
                Submit report
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function TipCard({ title, tips }: { title: string; tips: string[] }) {
  return (
    <div className="border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center border border-border">
          <Lightbulb className="size-4" aria-hidden="true" />
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <ol className="mt-4 grid gap-3">
        {tips.map((tip, index) => (
          <li key={tip} className="flex gap-3 text-sm leading-5">
            <span className="font-mono text-xs text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{tip}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
