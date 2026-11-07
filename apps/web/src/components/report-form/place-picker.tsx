"use client";

import { Input } from "@myfinds/ui/components/input";
import { Label } from "@myfinds/ui/components/label";
import { Select } from "@myfinds/ui/components/select";
import { cn } from "@myfinds/ui/lib/utils";
import { Search } from "lucide-react";

import type { PlaceDirectoryEntry } from "@/lib/report-api";

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
  places: PlaceDirectoryEntry[];
  disabled?: boolean;
  error?: string;
  onChange: (value: PlaceValue) => void;
};

export function PlacePicker({ id, label, value, places, disabled, error, onChange }: PlacePickerProps) {
  const states = [...new Map(places.map((place) => [place.stateId, place.state])).entries()];
  const cities = [
    ...new Map(
      places
        .filter((place) => place.stateId === value.stateId)
        .map((place) => [place.cityId, place.city]),
    ).entries(),
  ];
  const stations = places.filter(
    (place) =>
      place.stateId === value.stateId &&
      place.cityId === value.cityId &&
      place.placeType === value.placeType,
  );

  const update = (key: keyof PlaceValue, nextValue: string) => {
    if (key === "state") {
      const state = states.find(([stateId]) => stateId === nextValue);
      onChange({ ...emptyPlace(), stateId: state?.[0] ?? "", state: state?.[1] ?? "" });
      return;
    }
    if (key === "city") {
      const city = cities.find(([cityId]) => cityId === nextValue);
      onChange({
        ...value,
        cityId: city?.[0] ?? "",
        city: city?.[1] ?? "",
        placeType: "",
        stationId: "",
        station: "",
      });
      return;
    }
    if (key === "placeType") {
      onChange({ ...value, placeType: nextValue, stationId: "", station: "" });
      return;
    }
    if (key === "station") {
      const station = stations.find((place) => place.station === nextValue);
      onChange({ ...value, stationId: station?.stationId ?? "", station: nextValue });
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
          <Select
            id={`${id}-state`}
            className={selectClassName.replace("appearance-none pr-9", "")}
            value={value.stateId}
            disabled={disabled || places.length === 0}
            aria-required="true"
            aria-invalid={Boolean(error) && !value.state}
            onChange={(event) => update("state", event.target.value)}
          >
            <option value="">Choose a state</option>
            {states.map(([stateId, state]) => (
              <option key={stateId} value={stateId}>
                {state}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${id}-city`} className="text-sm font-semibold">
            City
            <RequiredMark />
          </Label>
          <Select
            id={`${id}-city`}
            className={selectClassName.replace("appearance-none pr-9", "")}
            value={value.cityId}
            disabled={disabled || !value.stateId}
            aria-required="true"
            aria-invalid={Boolean(error) && !value.city}
            onChange={(event) => update("city", event.target.value)}
          >
            <option value="">Choose a city</option>
            {cities.map(([cityId, city]) => (
              <option key={cityId} value={cityId}>
                {city}
              </option>
            ))}
          </Select>
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
                disabled={disabled || !value.cityId}
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
            disabled={disabled || !value.placeType}
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
            <option key={station.stationId} value={station.station} />
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
          disabled={disabled}
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
