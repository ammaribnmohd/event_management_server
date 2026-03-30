const { z } = require("zod");

const phoneRegex = /^(?=(?:.*\d){7,15}$)\+?[0-9\s\-()]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}$/;
const objectIdRegex = /^[a-f\d]{24}$/i;

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(6),
});

const listEventsSchema = z.object({
  search: z.string().trim().default(""),
  sort: z.enum(["title", "eventDate", "event_date"]).default("eventDate"),
  order: z.enum(["ASC", "DESC"]).default("DESC"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(6),
});

const idParamSchema = z.object({
  id: z.string().trim().regex(objectIdRegex, "Invalid event id"),
});

const registerAdminSchema = z
  .object({
    username: z.string().trim().min(3, "Username must be at least 3 characters"),
    email: z
      .string()
      .trim()
      .regex(emailRegex, "Invalid email format")
      .transform((value) => value.toLowerCase()),
    phone: z
      .string()
      .trim()
      .regex(phoneRegex, "Invalid phone number format")
      .transform((value) => value.replace(/\s+/g, " ")),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const eventSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  eventDate: z.string().regex(dateRegex, "Invalid event date"),
  eventTime: z.string().regex(timeRegex, "Invalid event time"),
  location: z.string().trim().min(1, "Location is required"),
  maxCapacity: z.coerce.number().int().min(1, "Invalid maximum capacity"),
});

const attendeeSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z
    .string()
    .trim()
    .regex(emailRegex, "Invalid email format")
    .transform((value) => value.toLowerCase()),
  phone: z
    .string()
    .trim()
    .min(1, "Phone is required")
    .regex(phoneRegex, "Invalid phone number format"),
});

const eventIdSchema = z.object({
  eventId: z.string().trim().regex(objectIdRegex, "Invalid event ID"),
});

module.exports = {
  paginationSchema,
  listEventsSchema,
  idParamSchema,
  registerAdminSchema,
  loginSchema,
  eventSchema,
  attendeeSchema,
  eventIdSchema,
};
