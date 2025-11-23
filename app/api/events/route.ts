import connectToDatabase from "@/lib/mongodb";
import { v2 as cloudinary } from "cloudinary";

import { NextRequest, NextResponse } from "next/server";
import Event from "@/database/event.model";

/**
 * Create a new event from multipart/form-data, upload its image to Cloudinary, and persist the event to the database.
 *
 * Expects a multipart/form-data request containing an "image" file and other event fields. If present, the "tags"
 * and "agenda" fields should be JSON-encoded strings and will be parsed into arrays.
 *
 * @param req - Incoming Next.js request with multipart/form-data containing event fields and an "image" file
 * @returns A JSON response object: on success includes `{ message: "Event Created Successfully", event }`; on client errors returns a 400 with a descriptive `message`; on server errors returns a 500 with `message` and `error`
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    // Parse the form data from the request
    const formData = await req.formData();

    let event;

    try {
      //! gives an iterator of all key-value pairs
      //* converts this iterator into a plain JavaScript object.
      event = Object.fromEntries(formData.entries());
    } catch (error) {
      return NextResponse.json(
        { message: "Invalid JSON data format " },
        { status: 400 }
      );
    }
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        { message: "Image file is required" },
        { status: 400 }
      );
    }

    const tagsRaw = formData.get("tags");
    const agendaRaw = formData.get("agenda");

    let tags = [];
    let agenda = [];

    try {
      if (typeof tagsRaw === "string") {
        tags = JSON.parse(tagsRaw);
      }
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON format for tags" },
        { status: 400 }
      );
    }

    try {
      if (typeof agendaRaw === "string") {
        agenda = JSON.parse(agendaRaw);
      }
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON format for agenda" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { resource_type: "image", folder: "DevEvent" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        )
        .end(buffer);
    });

    event.image = (uploadResult as { secure_url: string }).secure_url;

    const createEvent = await Event.create({
      ...event,
      tags: tags,
      agenda: agenda
    });
    return NextResponse.json(
      { message: "Event Created Successfully", event: createEvent },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error handling [POST] request in events route: ", error);
    return NextResponse.json(
      {
        message: "Event Creation failed",
        error: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}

/**
 * Retrieve all events from the database sorted by creation time (newest first) and return them as JSON.
 *
 * @returns A JSON response containing `message` and `events` on success; on failure, a JSON response containing `message` and an `error` string.
 */
export async function GET() {
  try {
    await connectToDatabase();
    const events = await Event.find().sort({ createdAt: -1 });

    return NextResponse.json(
      { message: "Events fetched successfully", events },
      { status: 200 }
    );
    
  } catch (error) {
    return NextResponse.json(
      {
        message: "Event fetching failed",
        error: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}

// a route to handle fetching single event by its slug can be added as input -> returns the event details