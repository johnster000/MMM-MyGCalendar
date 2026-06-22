# MMM-MyGCalendar

A polished month-view calendar module for [MagicMirror²](https://magicmirror.builders/) that connects directly to Google Calendar via iCal URL.

Displays a rolling 4-week window: **1 past week · current week · 2 future weeks**.

- Click any **event chip** → full event detail modal
- Click any **date number** → day-view modal listing all events for that day (click any event there for full detail with a ← back button)
- Click **"+N more"** → same day-view modal

---

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/johnster000/MMM-MyGCalendar.git
cd MMM-MyGCalendar
npm install
```

---

## Getting Your Google Calendar iCal URL

1. Open [Google Calendar](https://calendar.google.com) in a browser.
2. Click the **⋮** next to the calendar name → **Settings and sharing**.
3. Scroll to **"Integrate calendar"**.
4. Copy the **"Secret address in iCal format"**:
   ```
   https://calendar.google.com/calendar/ical/you%40gmail.com/private-XXXXXX/basic.ics
   ```
5. Paste it into the `url` field below.

> **Note:** This URL gives full read access to your private calendar — treat it like a password.

---

## Configuration

```javascript
{
  module: "MMM-MyGCalendar",
  position: "top_bar",
  config: {
    calendars: [
      {
        name: "Personal",
        url: "https://calendar.google.com/calendar/ical/you%40gmail.com/private-HASH/basic.ics",
        color: "#4285F4"
      },
      {
        name: "Work",
        url: "https://calendar.google.com/calendar/ical/work%40example.com/private-HASH/basic.ics",
        color: "#0F9D58"
      }
    ]
  }
}
```

### All Options

| Option               | Default        | Description                                                      |
|----------------------|----------------|------------------------------------------------------------------|
| `calendars`          | `[]`           | Array of calendar sources (see above)                            |
| `calendars[].name`   | `"Calendar"`   | Display name shown in modals                                     |
| `calendars[].url`    | —              | iCal URL from Google Calendar settings                           |
| `calendars[].color`  | `"#4285F4"`    | Hex color for event chips and modal header                       |
| `updateInterval`     | `900000` (15m) | How often to re-fetch calendar data (ms)                         |
| `weekStartsOnMonday` | `false`        | Set `true` for Mon–Sun week layout                               |
| `backgroundColor`    | `"#ffffff"`    | Background color of the calendar card                            |
| `pastWeekOpacity`    | `0.45`         | Opacity of the past-week row (0 = invisible, 1 = full)           |
| `maxEventsPerDay`    | `3`            | Max chips shown per day cell (overflow shown as clickable "+N more") |

### Suggested calendar colors

| Color        | Hex       |
|--------------|-----------|
| Google Blue  | `#4285F4` |
| Google Green | `#0F9D58` |
| Google Red   | `#DB4437` |
| Purple       | `#7986CB` |
| Teal         | `#009688` |
| Pink         | `#E91E63` |
| Amber        | `#F4B400` |

---

## Interactions

| Tap target          | Result                                              |
|---------------------|-----------------------------------------------------|
| Event chip          | Event detail modal (title, time, location, notes)   |
| Date number         | Day-view modal — all events for that day            |
| "+N more" label     | Day-view modal — all events for that day            |
| Event in day modal  | Event detail modal with ← back to day view          |
| Backdrop / Esc      | Close modal                                         |
