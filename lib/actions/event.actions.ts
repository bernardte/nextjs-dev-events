"use server";
import Event from "@/database/event.model";
import connectToDatabase from "../mongodb";

export const getSimilarEventBySlug = async (slug: string) => {
  try {
    await connectToDatabase();

    const event = await Event.findOne({ slug });
    if (!event) {
      console.log("Event not found:", slug);
      return [];
    }

    const tagsArray = Array.isArray(event.tags) ? event.tags : [];
    if (tagsArray.length === 0) {
      console.log("No tags on event:", slug);
      return [];
    }

    const similarEvents = await Event.find({
      _id: { $ne: event._id },
      tags: { $in: tagsArray },
    }).lean();

    console.log("Similar events found:", similarEvents.length);
    return similarEvents;
  } catch (error) {
    console.error("Error getting similar events:", error);
    return [];
  }
};
