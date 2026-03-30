const express = require("express");
const auth = require("../middleware/auth");
const {
  createEvent,
  deleteEvent,
  exportEventReport,
  getEventDetail,
  listAdminEvents,
  listAllAttendees,
  listEventAttendees,
  listPublicEvents,
  registerForEvent,
  updateEvent,
} = require("../controllers/eventController");

const router = express.Router();

router.get("/events", listPublicEvents);
router.get("/events/:id", getEventDetail);
router.post("/events/:id/register", registerForEvent);

router.get("/admin/events", auth, listAdminEvents);
router.post("/admin/events", auth, createEvent);
router.put("/admin/events/:id", auth, updateEvent);
router.delete("/admin/events/:id", auth, deleteEvent);
router.get("/admin/events/:eventId/attendees", auth, listEventAttendees);
router.get("/admin/events/:eventId/report.csv", auth, exportEventReport);
router.get("/admin/attendees", auth, listAllAttendees);

module.exports = router;
