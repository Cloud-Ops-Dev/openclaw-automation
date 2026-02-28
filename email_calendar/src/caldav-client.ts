import { DAVClient, DAVCalendar, DAVObject } from 'tsdav';

export interface CalendarEvent {
  id: string;
  uid: string;
  etag: string;
  url: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  recurrence?: string;
  status?: string;
  organizer?: string;
  attendees?: Array<{ email: string; name?: string; status?: string }>;
  raw?: string;
}

export interface Calendar {
  id: string;
  displayName: string;
  url: string;
  ctag?: string;
  color?: string;
  description?: string;
}

export class FastmailCalendarClient {
  private client: DAVClient | null = null;
  private calendars: DAVCalendar[] = [];

  constructor(
    private email: string,
    private appPassword: string
  ) {}

  async initialize(): Promise<void> {
    console.error('📅 Initializing CalDAV client...');

    this.client = new DAVClient({
      serverUrl: 'https://caldav.fastmail.com/',
      credentials: {
        username: this.email,
        password: this.appPassword
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav'
    });

    try {
      await this.client.login();
      console.error('✅ CalDAV client logged in');

      // Fetch calendars
      this.calendars = await this.client.fetchCalendars();
      console.error(`📅 Found ${this.calendars.length} calendars`);
    } catch (error) {
      console.error('❌ CalDAV login failed:', error);
      throw error;
    }
  }

  async listCalendars(): Promise<Calendar[]> {
    if (!this.client) {
      throw new Error('CalDAV client not initialized');
    }

    return this.calendars.map(cal => ({
      id: cal.url,
      displayName: typeof cal.displayName === 'string' ? cal.displayName : 'Unnamed Calendar',
      url: cal.url,
      ctag: cal.ctag,
      description: typeof cal.description === 'string' ? cal.description : undefined
    }));
  }

  async listEvents(options: {
    calendarId?: string;
    startDate: Date;
    endDate: Date;
  }): Promise<CalendarEvent[]> {
    if (!this.client) {
      throw new Error('CalDAV client not initialized');
    }

    const calendarsToQuery = options.calendarId
      ? this.calendars.filter(c => c.url === options.calendarId)
      : this.calendars;

    const allEvents: CalendarEvent[] = [];

    for (const calendar of calendarsToQuery) {
      try {
        const objects = await this.client.fetchCalendarObjects({
          calendar,
          timeRange: {
            start: options.startDate.toISOString(),
            end: options.endDate.toISOString()
          }
        });

        for (const obj of objects) {
          const event = this.parseCalendarObject(obj);
          if (event) {
            allEvents.push(event);
          }
        }
      } catch (error) {
        console.error(`Error fetching events from ${calendar.displayName}:`, error);
      }
    }

    // Sort by start date
    allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

    return allEvents;
  }

  async getEvent(calendarId: string, eventUrl: string): Promise<CalendarEvent | null> {
    if (!this.client) {
      throw new Error('CalDAV client not initialized');
    }

    const calendar = this.calendars.find(c => c.url === calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    try {
      const objects = await this.client.fetchCalendarObjects({
        calendar,
        objectUrls: [eventUrl]
      });

      if (objects.length > 0) {
        return this.parseCalendarObject(objects[0]);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    }

    return null;
  }

  async createEvent(options: {
    calendarId: string;
    summary: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    attendees?: Array<{ email: string; name?: string }>;
  }): Promise<{ eventUrl: string; uid: string }> {
    if (!this.client) {
      throw new Error('CalDAV client not initialized');
    }

    console.error('📅 Looking for calendar:', options.calendarId);
    console.error('📅 Available calendars:', this.calendars.map(c => c.url));

    const calendar = this.calendars.find(c => c.url === options.calendarId);
    if (!calendar) {
      // Try partial match
      const partialMatch = this.calendars.find(c =>
        c.url.includes(options.calendarId) || options.calendarId.includes(c.url)
      );
      if (partialMatch) {
        console.error('📅 Found partial match:', partialMatch.url);
        return this.createEventInCalendar(partialMatch, options);
      }
      throw new Error(`Calendar not found. Requested: ${options.calendarId}, Available: ${this.calendars.map(c => c.url).join(', ')}`);
    }

    return this.createEventInCalendar(calendar, options);
  }

  private async createEventInCalendar(calendar: DAVCalendar, options: {
    summary: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    attendees?: Array<{ email: string; name?: string }>;
  }): Promise<{ eventUrl: string; uid: string }> {
    if (!this.client) {
      throw new Error('CalDAV client not initialized');
    }

    const uid = this.generateUID();
    const icsContent = this.buildICS({
      uid,
      ...options
    });

    console.error('📅 Creating event:', options.summary);

    try {
      const result = await this.client.createCalendarObject({
        calendar,
        filename: `${uid}.ics`,
        iCalString: icsContent
      });

      console.error('✅ Event created:', uid);

      return {
        eventUrl: result.url || `${calendar.url}${uid}.ics`,
        uid
      };
    } catch (error) {
      console.error('❌ Failed to create event:', error);
      throw error;
    }
  }

  async updateEvent(options: {
    calendarId: string;
    eventUrl: string;
    etag?: string;
    summary?: string;
    description?: string;
    location?: string;
    start?: Date;
    end?: Date;
    allDay?: boolean;
  }): Promise<void> {
    if (!this.client) {
      throw new Error('CalDAV client not initialized');
    }

    const calendar = this.calendars.find(c => c.url === options.calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    // First fetch the existing event
    const existingEvent = await this.getEvent(options.calendarId, options.eventUrl);
    if (!existingEvent) {
      throw new Error('Event not found');
    }

    // Merge updates
    const updatedEvent = {
      uid: existingEvent.uid,
      summary: options.summary ?? existingEvent.summary,
      description: options.description ?? existingEvent.description,
      location: options.location ?? existingEvent.location,
      start: options.start ?? existingEvent.start,
      end: options.end ?? existingEvent.end,
      allDay: options.allDay ?? existingEvent.allDay
    };

    const icsContent = this.buildICS(updatedEvent);

    console.error('📅 Updating event:', updatedEvent.summary);

    try {
      await this.client.updateCalendarObject({
        calendarObject: {
          url: options.eventUrl,
          etag: options.etag || existingEvent.etag,
          data: icsContent
        }
      });

      console.error('✅ Event updated');
    } catch (error) {
      console.error('❌ Failed to update event:', error);
      throw error;
    }
  }

  async deleteEvent(calendarId: string, eventUrl: string, etag?: string): Promise<void> {
    if (!this.client) {
      throw new Error('CalDAV client not initialized');
    }

    console.error('🗑️ Deleting event:', eventUrl);

    try {
      await this.client.deleteCalendarObject({
        calendarObject: {
          url: eventUrl,
          etag: etag || ''
        }
      });

      console.error('✅ Event deleted');
    } catch (error) {
      console.error('❌ Failed to delete event:', error);
      throw error;
    }
  }

  async getTodaysEvents(): Promise<CalendarEvent[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.listEvents({
      startDate: today,
      endDate: tomorrow
    });
  }

  async getUpcomingEvents(days: number = 7): Promise<CalendarEvent[]> {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.listEvents({
      startDate: now,
      endDate
    });
  }

  private parseCalendarObject(obj: DAVObject): CalendarEvent | null {
    if (!obj.data) return null;

    try {
      const data = obj.data;

      // Extract UID
      const uidMatch = data.match(/UID:(.+?)(?:\r?\n)/);
      const uid = uidMatch ? uidMatch[1].trim() : '';

      // Extract SUMMARY
      const summaryMatch = data.match(/SUMMARY:(.+?)(?:\r?\n)/);
      const summary = summaryMatch ? this.unescapeICS(summaryMatch[1].trim()) : 'No Title';

      // Extract DESCRIPTION
      const descMatch = data.match(/DESCRIPTION:(.+?)(?:\r?\n(?=[A-Z]))/s);
      const description = descMatch ? this.unescapeICS(descMatch[1].trim()) : undefined;

      // Extract LOCATION
      const locMatch = data.match(/LOCATION:(.+?)(?:\r?\n)/);
      const location = locMatch ? this.unescapeICS(locMatch[1].trim()) : undefined;

      // Extract DTSTART
      const startMatch = data.match(/DTSTART(?:;[^:]+)?:(.+?)(?:\r?\n)/);
      const startStr = startMatch ? startMatch[1].trim() : '';
      const allDay = startMatch && startMatch[0].includes('VALUE=DATE') && !startMatch[0].includes('VALUE=DATE-TIME');

      // Extract DTEND
      const endMatch = data.match(/DTEND(?:;[^:]+)?:(.+?)(?:\r?\n)/);
      const endStr = endMatch ? endMatch[1].trim() : startStr;

      // Extract STATUS
      const statusMatch = data.match(/STATUS:(.+?)(?:\r?\n)/);
      const status = statusMatch ? statusMatch[1].trim() : undefined;

      // Parse dates
      const start = this.parseICSDate(startStr);
      const end = this.parseICSDate(endStr);

      if (!start || !end) {
        console.error('Failed to parse dates for event:', uid);
        return null;
      }

      return {
        id: obj.url,
        uid,
        etag: obj.etag || '',
        url: obj.url,
        summary,
        description,
        location,
        start,
        end,
        allDay: !!allDay,
        status,
        raw: data
      };
    } catch (error) {
      console.error('Error parsing calendar object:', error);
      return null;
    }
  }

  private parseICSDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    try {
      // Format: YYYYMMDD or YYYYMMDDTHHmmssZ or YYYYMMDDTHHmmss
      if (dateStr.length === 8) {
        // All day event: YYYYMMDD
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        return new Date(year, month, day);
      } else if (dateStr.includes('T')) {
        // Date-time: YYYYMMDDTHHmmss or YYYYMMDDTHHmmssZ
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        const hour = parseInt(dateStr.substring(9, 11));
        const minute = parseInt(dateStr.substring(11, 13));
        const second = parseInt(dateStr.substring(13, 15)) || 0;

        if (dateStr.endsWith('Z')) {
          return new Date(Date.UTC(year, month, day, hour, minute, second));
        } else {
          return new Date(year, month, day, hour, minute, second);
        }
      }
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
    }

    return null;
  }

  private buildICS(event: {
    uid: string;
    summary: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    attendees?: Array<{ email: string; name?: string }>;
  }): string {
    const now = new Date();
    const dtstamp = this.formatICSDate(now, false);

    let dtstart: string;
    let dtend: string;

    if (event.allDay) {
      dtstart = `DTSTART;VALUE=DATE:${this.formatICSDate(event.start, true)}`;
      dtend = `DTEND;VALUE=DATE:${this.formatICSDate(event.end, true)}`;
    } else {
      dtstart = `DTSTART:${this.formatICSDate(event.start, false)}`;
      dtend = `DTEND:${this.formatICSDate(event.end, false)}`;
    }

    let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Novique.ai//Fastmail MCP Server//EN
BEGIN:VEVENT
UID:${event.uid}
DTSTAMP:${dtstamp}
${dtstart}
${dtend}
SUMMARY:${this.escapeICS(event.summary)}`;

    if (event.description) {
      ics += `\nDESCRIPTION:${this.escapeICS(event.description)}`;
    }

    if (event.location) {
      ics += `\nLOCATION:${this.escapeICS(event.location)}`;
    }

    if (event.attendees) {
      for (const attendee of event.attendees) {
        const cn = attendee.name ? `;CN=${this.escapeICS(attendee.name)}` : '';
        ics += `\nATTENDEE${cn}:mailto:${attendee.email}`;
      }
    }

    ics += `
END:VEVENT
END:VCALENDAR`;

    return ics;
  }

  private formatICSDate(date: Date, dateOnly: boolean): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    if (dateOnly) {
      return `${year}${month}${day}`;
    }

    const hour = String(date.getUTCHours()).padStart(2, '0');
    const minute = String(date.getUTCMinutes()).padStart(2, '0');
    const second = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}${month}${day}T${hour}${minute}${second}Z`;
  }

  private escapeICS(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  private unescapeICS(text: string): string {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }

  private generateUID(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}@novique.ai`;
  }
}
