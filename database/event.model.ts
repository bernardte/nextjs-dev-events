import { Schema, model, models, type HydratedDocument, type InferSchemaType } from "mongoose";
import type { Model } from "mongoose";

// Event schema definition with strong TypeScript types inferred from the schema
const eventSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    overview: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    time: {
      type: String,
      required: true,
      trim: true,
    },
    mode: {
      type: String,
      required: true,
      trim: true,
    },
    audience: {
      type: String,
      required: true,
      trim: true,
    },
    agenda: {
      type: [String],
      required: true,
      default: [],
    },
    organizer: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      required: true,
      default: [],
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
    strict: true,
  },
);

// TypeScript type representing an Event document
export type Event = InferSchemaType<typeof eventSchema>;
export type EventDocument = HydratedDocument<Event>;

// Helper to generate URL-friendly slugs from titles
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric characters
    .replace(/\s+/g, "-") // replace spaces with dashes
    .replace(/-+/g, "-"); // collapse consecutive dashes
}

// Normalize a date string to ISO (YYYY-MM-DD) format
function normalizeDateToISO(dateInput: string): string {
  const parsed = new Date(dateInput);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date format for event 'date' field.");
  }

  return parsed.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Normalize time to 24-hour HH:MM format
function normalizeTime(timeInput: string): string {
  const trimmed = timeInput.trim();

  // Accepts formats such as HH:MM, H:MM, HH:MM AM/PM
  const timeWithMeridiem = /^([0-1]?\d|2[0-3]):([0-5]\d)\s*([APap][Mm])?$/;
  const match = trimmed.match(timeWithMeridiem);

  if (!match) {
    throw new Error("Invalid time format for event 'time' field. Expected HH:MM or HH:MM AM/PM.");
  }

  let hours = Number.parseInt(match[1], 10);
  const minutes = match[2];
  const meridiem = match[3]?.toUpperCase();

  if (meridiem) {
    if (meridiem === "PM" && hours < 12) {
      hours += 12;
    } else if (meridiem === "AM" && hours === 12) {
      hours = 0;
    }
  }

  const hoursStr = hours.toString().padStart(2, "0");
  return `${hoursStr}:${minutes}`;
}

// Ensure required string fields are present and non-empty after trimming
function validateRequiredString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

const requiredStringFields: Array<keyof Event> = [
  "title",
  "description",
  "overview",
  "image",
  "venue",
  "location",
  "date",
  "time",
  "mode",
  "audience",
  "organizer",
];

// Attach validators for required trimmed strings
for (const field of requiredStringFields) {
  (eventSchema.path(field) as any).validate({
    validator: validateRequiredString,
    message: `${field} is required and cannot be empty`,
  });
}

// Pre-save hook to generate slug and normalize date/time
// - Generates a URL-friendly slug based on the title (only when the title changes)
// - Normalizes the date field to ISO YYYY-MM-DD
// - Normalizes the time field to HH:MM 24-hour format
// - Ensures required string fields are non-empty

// We use a function() instead of an arrow function so `this` is the document instance.
eventSchema.pre("save", function () {
  const doc = this as EventDocument;

  // Only recompute slug if the title changed or slug is missing
  if (doc.isModified("title") || !doc.slug) {
    doc.slug = generateSlug(doc.title);
  }

  try {
    if (doc.isModified("date")) {
      doc.date = normalizeDateToISO(doc.date);
    }

    if (doc.isModified("time")) {
      doc.time = normalizeTime(doc.time);
    }
  } catch (error) {
    return error as Error;
  }

  // Run a final check for required string fields at the document level
  for (const field of requiredStringFields) {
    const value = doc[field];
    if (!validateRequiredString(value)) {
      return new Error(`${field} is required and cannot be empty`);
    }
  }

});

export const Event: Model<Event> = models.Event ??
  model<Event>("Event", eventSchema);

export default Event;
