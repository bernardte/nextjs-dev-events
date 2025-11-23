import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Event from "@/database/event.model";

// Basic runtime validation for slug to avoid malformed queries
function isValidSlug(slug: unknown): slug is string {
  return typeof slug === "string" && slug.trim().length > 0;
}

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  const params = await context.params;
  const slug = params.slug;

  console.log("Received slug params: ", slug);

  if (!isValidSlug(slug)) {
    return NextResponse.json(
      { error: "A non-empty slug parameter is required." },
      { status: 400 },
    );
  }

  try {
    // Ensure a single shared database connection (cached in lib/mongodb)
    await connectToDatabase();

    // Sanitize the slug input
    const sanitizeSlug = slug.trim().toLowerCase();
    console.log("sanitized slug: ", sanitizeSlug);

    // Find the event by its unique slug
    const event = await Event.findOne({ slug: sanitizeSlug }).lean().exec();
    console.log("Fetch event by slug result: ", event);

    if (!event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 },
      );
    }

    // Successful lookup
    return NextResponse.json(
      { event },
      { status: 200 },
    );
  } catch (error) {
    // Log the error server-side in real applications (e.g., to an observability system)
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred while fetching the event.";

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
