"use client";

import { Input } from "@myfinds/ui/components/input";
import { Label } from "@myfinds/ui/components/label";
import { cn } from "@myfinds/ui/lib/utils";
import { Search } from "lucide-react";

import { placeDirectory } from "@/lib/preview-data";

import { FormField, RequiredMark } from "./fields";
import {
  emptyPlace,
  inputClassName,
  placeTypes,
  selectClassName,
  type PlaceValue,
} from "./schema";

type PlacePickerProps = {
  id: string;
  label: string;
  value: PlaceValue;
  error?: string;
  onChange: (value: PlaceValue) => void;
};

export function PlacePicker({ id, label, value, error, onChange }: PlacePickerProps) {
  const states = [...new Set(placeDirectory.map((place) => place.state))];
  const cities = [
    ...new Set(
      placeDirectory
        .filter((place) => place.state === value.state)
        .map((place) => place.city),
    ),
  ];
  const stations = placeDirectory.filter(
    (place) =>
      place.state === value.state &&
      place.city === value.city &&
      place.placeType === value.placeType,
  );

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
    <fieldset className="grid gap-4 border border-border bg-surface-muted p-4">
      <legend className="px-1 text-sm font-semibold">
        {label}
        <RequiredMark />
      </legend>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-state`} className="text-sm font-semibold">
            State
            <RequiredMark />
          </Label>
          <select
            id={`${id}-state`}
            className={selectClassName}
            value={value.state}
            aria-required="true"
            aria-invalid={Boolean(error) && !value.state}
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

        <div className="grid gap-2">
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
            aria-invalid={Boolean(error) && !value.city}
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
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-semibold" id={`${id}-type-label`}>
          Place type
          <RequiredMark />
        </span>
        <div
          role="group"
          aria-labelledby={`${id}-type-label`}
          className="grid grid-cols-3 gap-2"
        >
          {placeTypes.map((type) => {
            const selected = value.placeType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                aria-pressed={selected}
                disabled={!value.city}
                onClick={() => update("placeType", type.value)}
                className={cn(
                  "h-11 border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted-foreground",
                  selected
                    ? "border-foreground bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-foreground/60",
                )}
              >
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${id}-station`} className="text-sm font-semibold">
          Station or stop
          <RequiredMark />
        </Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={`${id}-station`}
            className={`${inputClassName} pl-9`}
            list={`${id}-stations`}
            value={value.station}
            disabled={!value.placeType}
            placeholder="Search station (e.g. Sample Central)"
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => update("station", event.target.value)}
          />
        </div>
        <datalist id={`${id}-stations`}>
          {stations.map((station) => (
            <option key={station.station} value={station.station} />
          ))}
        </datalist>
        {value.placeType && stations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No stations for this place type yet.
          </p>
        ) : null}
      </div>

      <FormField
        id={`${id}-note`}
        label="Platform, gate, or coach"
        optional
        description="A nearby landmark helps narrow down the location."
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
        <p
          id={`${id}-error`}
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
