import BookEvent from "@/components/BookEvent";
import EventCard from "@/components/EventCard";
import { IEvent } from "@/database/event.model";
import { getSimilarEventBySlug } from "@/lib/actions/event.actions";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const EventDetailItem = ({
  icon,
  alt,
  label,
}: {
  icon: string;
  alt: string;
  label: string;
}) => {
  return (
    <div className="flex flex-row gap-2 items-center">
      <Image src={icon} alt={alt} width={17} height={17} />
      <p>{label}</p>
    </div>
  );
};

const EventAgendaItem = ({ agendaItems }: { agendaItems: string[] }) => {
  return (
    <div className="agenda">
      <h2>Agenda</h2>
      <ul className="list-disc ">
        {agendaItems.map((item) => (
          <li key={item} className="pl-4 -indent-5">{item}</li>
        ))}
      </ul>
    </div>
  );
};

const EventTags = ({ tags }: { tags: string[] }) => (
  <div className="flex flex-row gap-1.5 flex-wrap">
    {tags.map((tag) => (
      <div className="pill" key={tag}>
        {tag}
      </div>
    ))}
  </div>
);

const EventDetailPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  'use cache'
  cacheLife("hours");
  const bookings = 10;

  const { slug } = await params;
  const request = await fetch(`${BASE_URL}/api/events/${slug}`, {
    next: { revalidate: 60 },
  });

  if (!request.ok) {
    if (request.status === 404) {
      return notFound();
    }

    throw new Error("Failed to fetch event: " + request.status);
  }

  const responseData = await request.json();

  const {
    event: {
      _id,
      description,
      image,
      overview,
      date,
      time,
      location,
      mode,
      agenda,
      audience,
      organizer,
      tags,
    },
  } = responseData;

  const similarEvents: IEvent[] = await getSimilarEventBySlug(slug);
  console.log("similar event: ", similarEvents);

  if (!description || !image || !overview || !date || !time || !location || !mode || !agenda || !audience || !tags) {
    return notFound();
  }

  return (
    <section id="event">
      <div className="header">
        <h1>Event Description</h1>
        <p>{description}</p>
      </div>

      <div className="details">
        {/* Left Side - Event Content */}
        <div className="content">
          <Image
            src={image}
            alt="Event Banner"
            width={800}
            height={800}
            className="banner"
          />

          <section className="flex-col gap-2">
            <h2>Overview</h2>
            <p>{overview}</p>
          </section>

          <section className="flex-col gap-2">
            <h2>Event Details</h2>
            <EventDetailItem
              icon="/icons/calendar.svg"
              alt="calendar"
              label={date}
            />
            <EventDetailItem icon="/icons/clock.svg" alt="clock" label={time} />
            <EventDetailItem icon="/icons/pin.svg" alt="pin" label={location} />
            <EventDetailItem icon="/icons/mode.svg" alt="mode" label={mode} />
            <EventDetailItem
              icon="/icons/audience.svg"
              alt="audience"
              label={audience}
            />
          </section>

          <EventAgendaItem
            agendaItems={
              Array.isArray(agenda) && agenda.length > 0 ? agenda : []
            }
          />

          <section className="flex-col-gap-2">
            <h2>About the Organizer</h2>
            <p>{organizer}</p>
          </section>

          <EventTags
            tags={Array.isArray(tags) && tags.length > 0 ? tags : []}
          />
        </div>
        {/* Right Side - Booking Form */}
        <aside className="booking">
          <div className="signup-card">
            <h2>Book Your Spot</h2>
            {bookings > 0 ? (
              <p className="text-sm">
                Join {bookings} people who have already booked their spot!
              </p>
            ) : (
              <p className="text-sm">Be the first to book your spot!</p>
            )}

            <BookEvent eventId={_id.toString()} slug={slug} />
          </div>
        </aside>
      </div>

      <div className="flex w-full flex-col gap-4 pt-20">
        <h2>Similar Events</h2>
        <div className="events">
          {similarEvents.length > 0 &&
            similarEvents.map((similarEvent: IEvent) => (
              <EventCard key={similarEvent._id.toString()} {...similarEvent} />
            ))}
        </div>
      </div>
    </section>
  );
};

export default EventDetailPage;
