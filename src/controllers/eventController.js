const { stringify } = require("csv-stringify/sync");
const Attendee = require("../models/Attendee");
const Event = require("../models/Event");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const {
  attendeeSchema,
  eventIdSchema,
  eventSchema,
  idParamSchema,
  listEventsSchema,
} = require("../validation/schemas");

function toResponseEvent(eventDoc, attendeeCount = 0) {
  return {
    id: eventDoc._id.toString(),
    _id: eventDoc._id.toString(),
    title: eventDoc.title,
    description: eventDoc.description,
    eventDate: eventDoc.eventDate,
    eventTime: eventDoc.eventTime,
    location: eventDoc.location,
    maxCapacity: Number(eventDoc.maxCapacity),
    createdBy: eventDoc.createdBy ? eventDoc.createdBy.toString() : null,
    createdAt: eventDoc.createdAt,
    updatedAt: eventDoc.updatedAt,
    event_date: eventDoc.eventDate,
    event_time: eventDoc.eventTime,
    max_capacity: Number(eventDoc.maxCapacity),
    created_by: eventDoc.createdBy ? eventDoc.createdBy.toString() : null,
    created_at: eventDoc.createdAt,
    updated_at: eventDoc.updatedAt,
    attendee_count: Number(attendeeCount),
  };
}

function sortFieldFromInput(sort) {
  if (sort === "event_date") {
    return "eventDate";
  }

  return sort;
}

async function getAttendeeCountByEvent(eventId) {
  return Attendee.countDocuments({ eventId });
}

async function getEventCapacity(eventId) {
  const event = await Event.findById(eventId).select("maxCapacity").lean();
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  return Number(event.maxCapacity);
}

const listPublicEvents = asyncHandler(async (req, res) => {
  const parsed = listEventsSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new ApiError(400, "Invalid query parameters");
  }

  const { search, sort, order, page, perPage } = parsed.data;
  const offset = (page - 1) * perPage;
  const sortField = sortFieldFromInput(sort);
  const sortOrder = order === "ASC" ? 1 : -1;
  const query = search ? { title: { $regex: search, $options: "i" } } : {};

  const [total, events] = await Promise.all([
    Event.countDocuments(query),
    Event.find(query).sort({ [sortField]: sortOrder }).skip(offset).limit(perPage).lean(),
  ]);

  const eventIds = events.map((item) => item._id);
  const attendeeCounts = await Attendee.aggregate([
    { $match: { eventId: { $in: eventIds } } },
    { $group: { _id: "$eventId", count: { $sum: 1 } } },
  ]);

  const attendeeCountMap = attendeeCounts.reduce((acc, item) => {
    acc[item._id.toString()] = Number(item.count || 0);
    return acc;
  }, {});

  const data = events.map((event) => {
    const attendeeCount = attendeeCountMap[event._id.toString()] || 0;

    return {
      ...toResponseEvent(event, attendeeCount),
      is_full: attendeeCount >= Number(event.maxCapacity),
    };
  });

  res.json({
    success: true,
    data,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  });
});

const getEventDetail = asyncHandler(async (req, res) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ApiError(400, "Invalid event id");
  }

  const { id } = parsed.data;
  const event = await Event.findById(id).lean();
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  const currentAttendees = await getAttendeeCountByEvent(id);
  const maxCapacity = Number(event.maxCapacity);

  res.json({
    success: true,
    data: {
      ...toResponseEvent(event, currentAttendees),
      current_attendees: currentAttendees,
      max_capacity: maxCapacity,
      is_full: currentAttendees >= maxCapacity,
      spots_remaining: maxCapacity - currentAttendees,
    },
  });
});

const registerForEvent = asyncHandler(async (req, res) => {
  const parsedParams = idParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new ApiError(400, "Invalid event id");
  }

  const parsedBody = attendeeSchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new ApiError(400, parsedBody.error.issues.map((item) => item.message).join("\n"));
  }

  const { id: eventId } = parsedParams.data;
  const { name, email, phone } = parsedBody.data;

  const maxCapacity = await getEventCapacity(eventId);
  const attendeeCount = await getAttendeeCountByEvent(eventId);

  if (attendeeCount >= maxCapacity) {
    throw new ApiError(400, "Sorry, this event is already at full capacity.");
  }

  await Attendee.create({ eventId, name, email, phone });

  res.status(201).json({ success: true, message: "Registration successful!" });
});

const listAdminEvents = asyncHandler(async (req, res) => {
  const parsed = listEventsSchema.safeParse({ ...req.query, perPage: req.query.perPage || 8 });
  if (!parsed.success) {
    throw new ApiError(400, "Invalid query parameters");
  }

  const { search, sort, order, page, perPage } = parsed.data;
  const offset = (page - 1) * perPage;
  const sortField = sortFieldFromInput(sort);
  const sortOrder = order === "ASC" ? 1 : -1;
  const query = search ? { title: { $regex: search, $options: "i" } } : {};

  const [total, events] = await Promise.all([
    Event.countDocuments(query),
    Event.find(query).sort({ [sortField]: sortOrder }).skip(offset).limit(perPage).lean(),
  ]);

  const eventIds = events.map((item) => item._id);
  const attendeeCounts = await Attendee.aggregate([
    { $match: { eventId: { $in: eventIds } } },
    { $group: { _id: "$eventId", count: { $sum: 1 } } },
  ]);

  const attendeeCountMap = attendeeCounts.reduce((acc, item) => {
    acc[item._id.toString()] = Number(item.count || 0);
    return acc;
  }, {});

  res.json({
    success: true,
    data: events.map((event) => {
      const attendeeCount = attendeeCountMap[event._id.toString()] || 0;

      return {
        ...toResponseEvent(event, attendeeCount),
        max_capacity: Number(event.maxCapacity),
      };
    }),
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  });
});

const createEvent = asyncHandler(async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((item) => item.message).join("\n"));
  }

  const { title, description, eventDate, eventTime, location, maxCapacity } = parsed.data;
  const createdBy = req.user.id;

  await Event.create({
    title,
    description,
    eventDate,
    eventTime,
    location,
    maxCapacity,
    createdBy,
  });

  res.status(201).json({ success: true, message: "Event created successfully" });
});

const updateEvent = asyncHandler(async (req, res) => {
  const parsedParams = idParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new ApiError(400, "Invalid event id");
  }

  const parsedBody = eventSchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new ApiError(400, parsedBody.error.issues.map((item) => item.message).join("\n"));
  }

  const { id } = parsedParams.data;
  const { title, description, eventDate, eventTime, location, maxCapacity } = parsedBody.data;

  const updatedEvent = await Event.findByIdAndUpdate(
    id,
    {
      title,
      description,
      eventDate,
      eventTime,
      location,
      maxCapacity,
    },
    { new: true }
  );

  if (!updatedEvent) {
    throw new ApiError(404, "Event not found");
  }

  res.json({ success: true, message: "Event updated successfully" });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ApiError(400, "Invalid event id");
  }

  const { id } = parsed.data;

  const deletedEvent = await Event.findByIdAndDelete(id);

  if (!deletedEvent) {
    throw new ApiError(404, "Event not found");
  }

  await Attendee.deleteMany({ eventId: id });

  res.json({ success: true, message: "Event deleted successfully" });
});

const listEventAttendees = asyncHandler(async (req, res) => {
  const parsed = eventIdSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ApiError(400, "Invalid event ID");
  }

  const { eventId } = parsed.data;
  const rows = await Attendee.find({ eventId })
    .sort({ createdAt: -1 })
    .select("name email createdAt")
    .lean();

  res.json({
    success: true,
    attendees: rows.map((item) => ({
      name: item.name,
      email: item.email,
      registration_date: item.createdAt,
    })),
  });
});

const listAllAttendees = asyncHandler(async (_req, res) => {
  const rows = await Attendee.find({})
    .sort({ createdAt: -1 })
    .populate("eventId", "title eventDate location")
    .lean();

  res.json({
    success: true,
    attendees: rows.map((item) => ({
      id: item._id.toString(),
      event_id: item.eventId?._id ? item.eventId._id.toString() : null,
      name: item.name,
      email: item.email,
      phone: item.phone,
      registration_date: item.createdAt,
      event_title: item.eventId?.title || null,
      event_date: item.eventId?.eventDate || null,
      location: item.eventId?.location || null,
    })),
  });
});

const exportEventReport = asyncHandler(async (req, res) => {
  const parsed = eventIdSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ApiError(400, "Invalid event ID");
  }

  const { eventId } = parsed.data;

  const event = await Event.findById(eventId).select("title").lean();
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  const attendees = await Attendee.find({ eventId })
    .sort({ createdAt: 1 })
    .select("name email phone createdAt")
    .lean();

  const reportRows = attendees.map((item) => ({
    name: item.name,
    email: item.email,
    phone: item.phone,
    registration_date: item.createdAt,
  }));

  const csv = stringify(reportRows, {
    header: true,
    columns: ["name", "email", "phone", "registration_date"],
  });

  const safeName = event.title.replace(/[^a-zA-Z0-9-_]/g, "_");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=\"${safeName}_attendees.csv\"`);
  res.send(csv);
});

module.exports = {
  listPublicEvents,
  getEventDetail,
  registerForEvent,
  listAdminEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  listEventAttendees,
  listAllAttendees,
  exportEventReport,
};
