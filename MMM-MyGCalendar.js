Module.register("MMM-MyGCalendar", {
  defaults: {
    calendars: [],
    updateInterval: 15 * 60 * 1000,
    weekStartsOnMonday: false,
    backgroundColor: "#ffffff",
    pastWeekOpacity: 0.45,
    maxEventsPerDay: 3,
    fullWidth: false,
    showHeader: true,
    debug: false,
    colorRules: [],
  },

  // Maps Google Calendar color values → hex.
  // Google iCal exports may use CSS names (RFC 7986), numeric IDs, or direct hex.
  GOOGLE_COLOR_MAP: {
    // By CSS color name
    tomato:    "#D50000",
    flamingo:  "#E67C73",
    tangerine: "#F4511E",
    banana:    "#F6BF26",
    sage:      "#33B679",
    basil:     "#0B8043",
    peacock:   "#039BE5",
    blueberry: "#3F51B5",
    lavender:  "#7986CB",
    grape:     "#8E24AA",
    graphite:  "#616161",
    // By Google Calendar numeric color ID (used in some iCal exports)
    "1":  "#7986CB", // Lavender
    "2":  "#33B679", // Sage
    "3":  "#8E24AA", // Grape
    "4":  "#E67C73", // Flamingo
    "5":  "#F6BF26", // Banana
    "6":  "#F4511E", // Tangerine
    "7":  "#039BE5", // Peacock
    "8":  "#616161", // Graphite
    "9":  "#3F51B5", // Blueberry
    "10": "#0B8043", // Basil
    "11": "#D50000", // Tomato
  },

  events: [],
  loaded: false,
  currentDayModalDate: null,

  start() {
    this._compiledColorRules = (this.config.colorRules || []).map(rule => ({
      ...rule,
      pattern: rule.keyword instanceof RegExp ? rule.keyword : new RegExp(rule.keyword, "i")
    }));
    this.sendSocketNotification("GCAL_INIT", this.config);
    this.scheduleMidnightRefresh();
  },

  getStyles() {
    return ["MMM-MyGCalendar.css"];
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "GCAL_EVENTS") {
      this.events = payload;
      this.loaded = true;
      this.updateDom(300);
    }
  },

  scheduleMidnightRefresh() {
    const now = new Date();
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(0, 1, 0, 0);
    setTimeout(() => {
      this.updateDom(0);
      this.scheduleMidnightRefresh();
    }, next - now);
  },

  // ── Date helpers ──────────────────────────────────────────────

  getDisplayWindow() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dow = today.getDay();
    const offset = this.config.weekStartsOnMonday
      ? dow === 0 ? 6 : dow - 1
      : dow;

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - offset);

    const displayStart = new Date(weekStart);
    displayStart.setDate(weekStart.getDate() - 7);

    const displayEnd = new Date(displayStart);
    displayEnd.setDate(displayStart.getDate() + 27);

    return { displayStart, displayEnd, today, currentWeekStart: weekStart };
  },

  // ── DOM builders ──────────────────────────────────────────────

  getDom() {
    const { displayStart } = this.getDisplayWindow();

    const wrapper = document.createElement("div");
    wrapper.className = "gcal-wrapper" + (this.config.fullWidth ? " gcal-full-width" : "");
    wrapper.style.setProperty("--gcal-bg", this.config.backgroundColor || "#ffffff");
    wrapper.style.setProperty("--gcal-past-opacity", String(this.config.pastWeekOpacity ?? 0.45));
    wrapper.style.setProperty("--gcal-max-events", String(this.config.maxEventsPerDay ?? 3));

    if (!this.loaded) {
      const card = document.createElement("div");
      card.className = "gcal-card gcal-loading-card";
      card.innerHTML = '<div class="gcal-loading"><div class="gcal-spinner"></div><span>Loading calendar…</span></div>';
      wrapper.appendChild(card);
      return wrapper;
    }

    const card = document.createElement("div");
    card.className = "gcal-card";

    if (this.config.showHeader !== false) {
      card.appendChild(this.buildHeader(displayStart));
    }
    card.appendChild(this.buildDayHeaders());
    card.appendChild(this.buildGrid());

    wrapper.appendChild(card);

    this.ensureModal();

    return wrapper;
  },

  buildHeader(displayStart) {
    const { displayEnd } = this.getDisplayWindow();
    const header = document.createElement("div");
    header.className = "gcal-header";

    const startLabel = displayStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const endLabel = displayEnd.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const title = document.createElement("span");
    title.className = "gcal-month-title";
    title.textContent = startLabel === endLabel
      ? startLabel
      : `${displayStart.toLocaleDateString("en-US", { month: "long" })} – ${endLabel}`;

    header.appendChild(title);
    return header;
  },

  buildDayHeaders() {
    const days = this.config.weekStartsOnMonday
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const row = document.createElement("div");
    row.className = "gcal-day-headers";
    days.forEach((d) => {
      const cell = document.createElement("div");
      cell.className = "gcal-day-header";
      cell.textContent = d;
      row.appendChild(cell);
    });
    return row;
  },

  buildGrid() {
    const { displayStart, today, currentWeekStart } = this.getDisplayWindow();
    const grid = document.createElement("div");
    grid.className = "gcal-grid";

    for (let w = 0; w < 4; w++) {
      const row = document.createElement("div");
      row.className = "gcal-week";

      for (let d = 0; d < 7; d++) {
        const date = new Date(displayStart);
        date.setDate(displayStart.getDate() + w * 7 + d);

        const isToday = date.toDateString() === today.toDateString();
        const isPast = date < currentWeekStart;

        row.appendChild(this.buildDay(date, isToday, isPast));
      }

      grid.appendChild(row);
    }

    return grid;
  },

  buildDay(date, isToday, isPast) {
    const cell = document.createElement("div");
    let cls = "gcal-day";
    if (isToday) cls += " gcal-today";
    if (isPast) cls += " gcal-past";
    cell.className = cls;

    const topRow = document.createElement("div");
    topRow.className = "gcal-day-top-row";

    const numWrap = document.createElement("div");
    numWrap.className = "gcal-day-num-wrap";

    if (date.getDate() === 1) {
      const monthTag = document.createElement("span");
      monthTag.className = "gcal-day-month-tag";
      monthTag.textContent = date.toLocaleDateString("en-US", { month: "short" });
      numWrap.appendChild(monthTag);
    }

    const num = document.createElement("span");
    num.className = "gcal-day-number";
    num.textContent = date.getDate();
    numWrap.appendChild(num);

    // Click the date number → day modal
    numWrap.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showDayModal(new Date(date));
    });

    topRow.appendChild(numWrap);

    const eventsForDay = this.getEventsForDay(date);
    const max = this.config.maxEventsPerDay ?? 3;

    if (eventsForDay.length > max) {
      const badge = document.createElement("div");
      badge.className = "gcal-day-more-badge";
      badge.textContent = `+${eventsForDay.length - max}`;
      // Clicking the overflow badge also opens the day modal
      badge.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showDayModal(new Date(date));
      });
      topRow.appendChild(badge);
    }

    cell.appendChild(topRow);

    const eventsWrap = document.createElement("div");
    eventsWrap.className = "gcal-day-events";

    eventsForDay.slice(0, max).forEach((ev) => {
      eventsWrap.appendChild(this.buildEventChip(ev));
    });

    cell.appendChild(eventsWrap);

    return cell;
  },

  buildEventChip(ev) {
    const chip = document.createElement("div");
    chip.className = "gcal-event";

    const color = this.getEventColor(ev);

    const dot = document.createElement("span");
    dot.className = "gcal-event-dot";
    dot.style.backgroundColor = color;

    const label = document.createElement("span");
    label.className = "gcal-event-label";
    label.textContent = ev.title;

    chip.appendChild(dot);
    chip.appendChild(label);

    chip.style.setProperty("--ev-color", color);
    chip.title = ev.title;

    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showModal(ev, null);
    });

    return chip;
  },

  getEventsForDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);

    return this.events.filter((ev) => {
      const start = new Date(ev.start);
      const end = new Date(ev.end);

      if (ev.allDay) {
        const s = new Date(start); s.setHours(0, 0, 0, 0);
        const e = new Date(end); e.setHours(0, 0, 0, 0);
        return d >= s && d < e;
      }

      return start < next && end > d;
    }).sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return new Date(a.start) - new Date(b.start);
    });
  },

  // ── Modal infrastructure ──────────────────────────────────────

  ensureModal() {
    const id = this.identifier + "_backdrop";
    if (!document.getElementById(id)) {
      const backdrop = document.createElement("div");
      backdrop.className = "gcal-modal-backdrop";
      backdrop.id = id;
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) this.hideModal();
      });

      const modal = document.createElement("div");
      modal.className = "gcal-modal";
      modal.id = this.identifier + "_modal";
      backdrop.appendChild(modal);

      document.body.appendChild(backdrop);

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") this.hideModal();
      });
    }
  },

  hideModal() {
    const backdrop = document.getElementById(this.identifier + "_backdrop");
    if (backdrop) backdrop.classList.remove("gcal-visible");
  },

  // ── Day modal ─────────────────────────────────────────────────

  showDayModal(date) {
    this.ensureModal();
    this.currentDayModalDate = date;

    const backdrop = document.getElementById(this.identifier + "_backdrop");
    const modal = document.getElementById(this.identifier + "_modal");
    if (!backdrop || !modal) return;

    modal.innerHTML = "";
    modal.scrollTop = 0;

    const eventsForDay = this.getEventsForDay(date);
    const count = eventsForDay.length;

    // ── Header ──
    const header = document.createElement("div");
    header.className = "gcal-modal-header gcal-modal-header--day";

    const headerContent = document.createElement("div");
    headerContent.className = "gcal-modal-header-content";

    const titleEl = document.createElement("h3");
    titleEl.className = "gcal-modal-title";
    titleEl.textContent = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    const subtitle = document.createElement("span");
    subtitle.className = "gcal-modal-subtitle";
    subtitle.textContent = count === 0 ? "No events" : count === 1 ? "1 event" : `${count} events`;

    headerContent.appendChild(titleEl);
    headerContent.appendChild(subtitle);

    const closeBtn = document.createElement("button");
    closeBtn.className = "gcal-modal-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "&#10005;";
    closeBtn.addEventListener("click", () => this.hideModal());

    header.appendChild(headerContent);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // ── Body ──
    const body = document.createElement("div");
    body.className = "gcal-modal-body gcal-day-modal-body";

    if (count === 0) {
      const empty = document.createElement("div");
      empty.className = "gcal-day-modal-empty";
      empty.textContent = "Nothing scheduled for this day.";
      body.appendChild(empty);
    } else {
      eventsForDay.forEach((ev) => {
        body.appendChild(this.buildDayEventItem(ev, date));
      });
    }

    modal.appendChild(body);
    backdrop.classList.add("gcal-visible");
  },

  buildDayEventItem(ev, date) {
    const item = document.createElement("div");
    item.className = "gcal-day-event-item";
    item.style.setProperty("--ev-color", this.getEventColor(ev));

    const colorBar = document.createElement("div");
    colorBar.className = "gcal-day-event-bar";

    const content = document.createElement("div");
    content.className = "gcal-day-event-content";

    const start = new Date(ev.start);
    const end = new Date(ev.end);

    const timeStr = ev.allDay
      ? "All day"
      : `${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

    const time = document.createElement("span");
    time.className = "gcal-day-event-time";
    time.textContent = timeStr;

    const title = document.createElement("span");
    title.className = "gcal-day-event-title";
    title.textContent = ev.title;

    content.appendChild(time);
    content.appendChild(title);

    if (ev.location) {
      const loc = document.createElement("span");
      loc.className = "gcal-day-event-loc";
      loc.textContent = ev.location;
      content.appendChild(loc);
    }

    const calBadge = document.createElement("span");
    calBadge.className = "gcal-day-event-cal";
    calBadge.textContent = ev.calendarName;
    calBadge.style.color = ev.calendarColor;
    content.appendChild(calBadge);

    item.appendChild(colorBar);
    item.appendChild(content);

    // Click → open full event detail (with back button)
    item.addEventListener("click", () => {
      this.showModal(ev, date);
    });

    return item;
  },

  // ── Event detail modal ────────────────────────────────────────

  showModal(ev, fromDate) {
    this.ensureModal();
    const backdrop = document.getElementById(this.identifier + "_backdrop");
    const modal = document.getElementById(this.identifier + "_modal");
    if (!backdrop || !modal) return;

    modal.innerHTML = "";
    modal.scrollTop = 0;

    const color = this.getEventColor(ev);

    // ── Header ──
    const header = document.createElement("div");
    header.className = "gcal-modal-header";
    header.style.background = this.colorGradient(color);

    const headerContent = document.createElement("div");
    headerContent.className = "gcal-modal-header-content";

    const titleEl = document.createElement("h3");
    titleEl.className = "gcal-modal-title";
    titleEl.textContent = ev.title;
    headerContent.appendChild(titleEl);

    const btnGroup = document.createElement("div");
    btnGroup.className = "gcal-modal-btn-group";

    if (fromDate) {
      const backBtn = document.createElement("button");
      backBtn.className = "gcal-modal-back";
      backBtn.setAttribute("aria-label", "Back to day view");
      backBtn.innerHTML = "&#8592;";
      backBtn.addEventListener("click", () => this.showDayModal(fromDate));
      btnGroup.appendChild(backBtn);
    }

    const closeBtn = document.createElement("button");
    closeBtn.className = "gcal-modal-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "&#10005;";
    closeBtn.addEventListener("click", () => this.hideModal());
    btnGroup.appendChild(closeBtn);

    header.appendChild(headerContent);
    header.appendChild(btnGroup);
    modal.appendChild(header);

    // ── Body ──
    const body = document.createElement("div");
    body.className = "gcal-modal-body";

    const start = new Date(ev.start);
    const end = new Date(ev.end);

    const dateStr = ev.allDay
      ? start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
      : (() => {
          const day = start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
          const t1 = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
          const t2 = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
          return `${day}\n${t1} – ${t2}`;
        })();

    body.appendChild(this.modalRow("gcal-icon-clock", dateStr));

    if (ev.location) {
      body.appendChild(this.modalRow("gcal-icon-pin", ev.location));
    }

    if (ev.description) {
      body.appendChild(this.modalRow("gcal-icon-note", ev.description, true));
    }

    const calRow = document.createElement("div");
    calRow.className = "gcal-modal-row";
    const dot = document.createElement("span");
    dot.className = "gcal-modal-cal-dot";
    dot.style.backgroundColor = ev.calendarColor; // always show the calendar's color here
    const calName = document.createElement("span");
    calName.className = "gcal-modal-cal-name";
    calName.textContent = ev.calendarName;
    calRow.appendChild(dot);
    calRow.appendChild(calName);
    body.appendChild(calRow);

    modal.appendChild(body);
    backdrop.classList.add("gcal-visible");
  },

  modalRow(iconClass, text, preWrap) {
    const row = document.createElement("div");
    row.className = "gcal-modal-row";

    const icon = document.createElement("span");
    icon.className = `gcal-modal-icon ${iconClass}`;

    const span = document.createElement("span");
    span.className = "gcal-modal-text";
    if (preWrap) span.style.whiteSpace = "pre-wrap";
    span.textContent = text;

    row.appendChild(icon);
    row.appendChild(span);
    return row;
  },

  // Resolves the display color for an event.
  // Priority: iCal COLOR property → colorRules keyword match → calendar fallback color.
  getEventColor(ev) {
    // 1. Per-event color from iCal (works for non-Google sources; Google iCal doesn't export this)
    if (ev.eventColor) {
      const lower = ev.eventColor.toLowerCase().trim();
      return this.GOOGLE_COLOR_MAP[lower] || ev.eventColor;
    }

    // 2. Title-based color rules from config
    if (this._compiledColorRules && this._compiledColorRules.length) {
      for (const rule of this._compiledColorRules) {
        if (!rule.pattern || !rule.color) continue;
        if (rule.pattern.test(ev.title)) return rule.color;
      }
    }

    // 3. Calendar fallback color
    return ev.calendarColor || "#4285F4";
  },

  // Returns a gradient background string, falling back to solid for non-hex values.
  colorGradient(color) {
    if (color.startsWith("#")) {
      return `linear-gradient(135deg, ${color}, ${this.shadeColor(color, -20)})`;
    }
    return color;
  },

  shadeColor(hex, amount) {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  },
});
