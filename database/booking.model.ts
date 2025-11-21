import { Schema, model, models, type HydratedDocument, type InferSchemaType } from "mongoose";
import { Event } from "./event.model";
import type { Model } from "mongoose";

// Booking schema definition with strong TypeScript types inferred from the schema
const bookingSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true, // Index for faster lookups by event
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
    strict: true,
  },
);

// TypeScript type representing a Booking document
export type Booking = InferSchemaType<typeof bookingSchema>;
export type BookingDocument = HydratedDocument<Booking>;

// Simple email validation using a conservative regex
function isValidEmail(email: string): boolean {
  // RFC 5322-compliant regexes are very long; this is a pragmatic, production-acceptable pattern.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Schema-level email validator to catch malformed addresses early
bookingSchema.path("email").validate({
  validator: (value: unknown): boolean => {
    return typeof value === "string" && isValidEmail(value);
  },
  message: "Email must be a valid email address.",
});

// Pre-save hook to validate referenced Event and email
// - Ensures the referenced event exists before creating a booking
// - Validates email format again at the document level
bookingSchema.pre("save", async function () {
  const doc = this as BookingDocument;

  // Verify event existence; this prevents bookings for deleted or non-existent events
  try {
    const exists = await Event.exists({ _id: doc.eventId }).lean();

    if (!exists) {
      return new Error("Cannot create booking: referenced event does not exist.");
    }
  } catch (error) {
    return error as Error;
  }

  if (!isValidEmail(doc.email)) {
    return new Error("Email must be a valid email address.");
  }

});

// Create index on eventId for faster queries
bookingSchema.index({ eventId: 1 });

// Create compound index for common queries (event bookings by date)
bookingSchema.index({ eventId: 1, createdAt: -1 });

// Create index on email for user booking lookup
bookingSchema.index({ email: 1 });

export const Booking: Model<Booking> =
  models.Booking ?? model<Booking>("Booking", bookingSchema);

export default Booking;
