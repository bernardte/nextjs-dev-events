import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Event from "@/database/event.model";

/**
 * Determines whether a value is a non-empty string usable as a slug.
 *
 * @param slug - Value to validate as a slug
 * @returns `true` if `slug` is a string with at least one non-whitespace character, `false` otherwise.
 */
function isValidSlug(slug: unknown): slug is string {
  return typeof slug === "string" && slug.trim().length > 0;
}

/**
 * Fetches an Event by its slug route parameter and returns it as JSON.
 *
 * @param context - Object whose `params` promise resolves to `{ slug }` extracted from the route.
 * @returns A NextResponse whose JSON body is `{ event }` with status 200 when found; otherwise a JSON error object with status 400 (invalid slug), 404 (not found), or 500 (server error).
 */
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