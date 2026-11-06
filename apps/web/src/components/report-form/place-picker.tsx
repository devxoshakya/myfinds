"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@myfinds/ui/components/combobox";
import { Input } from "@myfinds/ui/components/input";
import { Label } from "@myfinds/ui/components/label";
import { cn } from "@myfinds/ui/lib/utils";

import type { PlaceDirectoryEntry } from "@/lib/report-api";

import { FormField, RequiredMark } from "./fields";
import {
  emptyPlace,
  inputClassName,
  placeTypes,
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

type SearchOption = { id: string; label: string };

function SearchableSelect({
  id,
  value,
  options,
  placeholder,
  disabled,
  invalid,
  onChange,
}: {
  id: string;
  value: string;
  options: SearchOption[];
  placeholder: string;
  disabled?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.id === value) ?? null;

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(option) => onChange(option?.id ?? "")}
      onInputValueChange={(inputValue) => {
        const option = options.find(
          (candidate) =>
            candidate.id === inputValue ||
            candidate.label.toLowerCase() === inputValue.toLowerCase(),
        );
        if (option) onChange(option.id);
      }}
      itemToStringValue={(option) => option?.label ?? ""}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder}
        aria-required="true"
        aria-invalid={invalid}
        autoComplete="off"
      />
      <ComboboxContent>
        <ComboboxEmpty>No matching places.</ComboboxEmpty>
        <ComboboxList>
          {(option) => (
            <ComboboxItem key={option.id} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function PlacePicker({ id, label, value, places, disabled, error, onChange }: PlacePickerProps) {
  const states: SearchOption[] = [...new Map(places.map((place) => [place.stateId, place.state])).entries()]
    .map(([id, label]) => ({ id, label }));
  const cities: SearchOption[] = [
    ...new Map(
      places
        .filter((place) => place.stateId === value.stateId)
        .map((place) => [place.cityId, place.city]),
    ).entries(),
  ].map(([id, label]) => ({ id, label }));
  const stations = places.filter(
    (place) =>
      place.stateId === value.stateId &&
      place.cityId === value.cityId &&
      place.placeType === value.placeType,
  );

  const update = (key: keyof PlaceValue, nextValue: string) => {
    if (key === "state") {
      const state = states.find((option) => option.id === nextValue);
      onChange({ ...emptyPlace(), stateId: state?.id ?? "", state: state?.label ?? "" });
      return;
    }
    if (key === "city") {
      const city = cities.find((option) => option.id === nextValue);
      onChange({
        ...value,
        cityId: city?.id ?? "",
        city: city?.label ?? "",
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
      const station = stations.find((place) => place.stationId === nextValue);
      onChange({
        ...value,
        stationId: station?.stationId ?? "",
        station: station?.station ?? "",
      });
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
          <SearchableSelect
            id={`${id}-state`}
            value={value.stateId}
            options={states}
            placeholder="Search states"
            disabled={disabled || places.length === 0}
            invalid={Boolean(error) && !value.state}
            onChange={(nextValue) => update("state", nextValue)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${id}-city`} className="text-sm font-semibold">
            City
            <RequiredMark />
          </Label>
          <SearchableSelect
            id={`${id}-city`}
            value={value.cityId}
            options={cities}
            placeholder="Search cities"
            disabled={disabled || !value.stateId}
            invalid={Boolean(error) && !value.city}
            onChange={(nextValue) => update("city", nextValue)}
          />
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
        <SearchableSelect
          id={`${id}-station`}
          value={value.stationId}
          options={stations.map((station) => ({ id: station.stationId, label: station.station }))}
          placeholder="Search station or stop"
          disabled={disabled || !value.placeType}
          invalid={Boolean(error)}
          onChange={(nextValue) => update("station", nextValue)}
        />
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
