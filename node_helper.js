const NodeHelper = require("node_helper");
const ical = require("node-ical");

module.exports = NodeHelper.create({
  start() {
    console.log("[MMM-MyGCalendar] Node helper started");
    this.config = null;
    this.updateTimer = null;
  },

  stop() {
    if (this.updateTimer) clearInterval(this.updateTimer);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "GCAL_INIT") {
      this.config = payload;
      this.fetchAll();
      this.scheduleUpdate();
    }
  },

  scheduleUpdate() {
    if (this.updateTimer) clearInterval(this.updateTimer);
    const interval = this.config.updateInterval || 15 * 60 * 1000;
    this.updateTimer = setInterval(() => this.fetchAll(), interval);
  },

  async fetchAll() {
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - 14);
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + 28);

    const allEvents = [];

    for (const cal of this.config.calendars) {
      try {
        const events = await this.fetchCalendar(cal, windowStart, windowEnd);
        allEvents.push(...events);
      } catch (err) {
        console.error(`[MMM-MyGCalendar] Error fetching "${cal.name}":`, err.message);
      }
    }

    allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
    this.sendSocketNotification("GCAL_EVENTS", allEvents);
  },

  async fetchCalendar(cal, windowStart, windowEnd) {
    const data = await ical.async.fromURL(cal.url, {});
    const events = [];

    for (const key in data) {
      const item = data[key];
      if (item.type !== "VEVENT") continue;

      if (item.rrule) {
        this.expandRecurring(item, cal, windowStart, windowEnd, events);
      } else {
        const start = this.toDate(item.start);
        const end = item.end ? this.toDate(item.end) : start;

        if (start <= windowEnd && end >= windowStart) {
          events.push(this.buildEvent(item, start, end, cal));
        }
      }
    }

    return events;
  },

  expandRecurring(item, cal, windowStart, windowEnd, events) {
    let occurrences;
    try {
      occurrences = item.rrule.between(windowStart, windowEnd, true);
    } catch (e) {
      return;
    }

    const duration = item.end
      ? this.toDate(item.end) - this.toDate(item.start)
      : 0;

    for (const date of occurrences) {
      // Skip EXDATE exceptions
      if (item.exdate) {
        const dateStr = date.toDateString();
        const isException = Object.values(item.exdate).some(
          (ex) => new Date(ex).toDateString() === dateStr
        );
        if (isException) continue;
      }

      // Use modified recurrence if it exists
      let src = item;
      if (item.recurrences) {
        const dateStr = date.toDateString();
        const match = Object.entries(item.recurrences).find(
          ([k]) => new Date(k).toDateString() === dateStr
        );
        if (match) src = match[1];
      }

      const occStart = new Date(date);
      const occEnd = new Date(occStart.getTime() + duration);
      events.push(this.buildEvent(src, occStart, occEnd, cal));
    }
  },

  buildEvent(item, start, end, cal) {
    const allDay =
      item.datetype === "date" ||
      (item.start && typeof item.start.toISOString !== "function" && item.start.val);

    return {
      id: `${item.uid || item.summary}_${start.getTime()}`,
      title: (item.summary || "Untitled").trim(),
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: !!allDay,
      location: item.location || "",
      description: item.description ? item.description.trim() : "",
      calendarName: cal.name || "Calendar",
      calendarColor: cal.color || "#4285F4",
    };
  },

  toDate(val) {
    if (val instanceof Date) return val;
    if (val && val.toJSDate) return val.toJSDate();
    return new Date(val);
  },
});
