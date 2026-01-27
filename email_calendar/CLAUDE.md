# Email & Calendar Integration for Clawdbot

**Location:** `/home/clayton/IDE/clawdbot/projects/automation/email_calendar/`
**Provider:** Fastmail (JMAP API)

## Overview

Fastmail integration for email and calendar automation through Jarvis. Handles both personal and Novique.ai company email/calendar.

## Status

**Current Phase:** Research & Planning

## Requirements

### Email Automation

1. **Incoming Email Classification**
   - Identify emails from customers vs other sources
   - Categorize by priority/type

2. **Customer Email Notifications**
   - Alert when new customer email arrives
   - Summarize count of new customer emails

3. **Draft Response System**
   - AI-generated draft replies
   - Present drafts for review before sending
   - Send approved drafts via Fastmail API

### Calendar Automation

4. **Scheduling Email Processing**
   - Detect scheduling-related emails from customers
   - Extract proposed meeting/call times
   - Create calendar entries automatically

5. **Appointment Notifications**
   - Notify of upcoming appointments, meetings, calls
   - Daily/morning briefing of schedule

6. **Natural Language Calendar Management**
   - Modify calendar via natural language commands
   - Examples:
     - "Move today's 9am call to tomorrow at 10am"
     - "Cancel my 2pm meeting"
     - "Schedule a call with John for Friday at 3pm"

## Technical Notes

### Fastmail APIs
- **Email:** JMAP protocol (modern replacement for IMAP)
  - Endpoint: `https://api.fastmail.com/jmap/session`
  - Documentation: https://www.fastmail.com/dev/
- **Calendar:** CalDAV protocol (JMAP calendars not yet available)
  - Endpoint: `https://caldav.fastmail.com/dav/principals/user/{email}/`
  - JMAP for Calendars spec still in draft (expires May 2026)

Note: Two different APIs required until JMAP calendar spec is finalized.

### Customer Identification

```
Email to sales@novique.ai    → ALWAYS customer (no analysis needed)
Email to support@novique.ai  → ALWAYS customer (no analysis needed)
Email to other @novique.ai   → Content analysis required
```

**Content Analysis (for other @novique.ai addresses):**
- Jarvis analyzes email content to classify as:
  - Customer or prospective customer inquiry → treat as customer
  - Service provider / vendor / SaaS notification → non-customer

Non-customer examples:
- SaaS notifications (billing, alerts, newsletters)
- Vendor communications
- Infrastructure/service emails

## Goals

- [ ] Research Fastmail JMAP API
- [ ] Research existing clawdbot email integrations
- [ ] Define customer identification logic
- [ ] Design architecture
- [ ] Implement email tools/skills
- [ ] Implement calendar tools/skills

## Related Files

- Clawdbot config: `~/.clawdbot/clawdbot.json`
- Main clawdbot source: `~/.npm-global/lib/node_modules/clawdbot/`

---

**Last Updated:** January 27, 2026
