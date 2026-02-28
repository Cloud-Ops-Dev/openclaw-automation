# automation/email_calendar — Contract (STRICT)

## Inheritance
This file inherits the IDE constitution at `~/IDE/CLAUDE.md` (STRICT MODE).
If any instruction here conflicts with the constitution, the constitution wins.

## Scope
Email + calendar automation integration for OpenClaw, under `projects/automation/email_calendar/`.

## Allowed Writes
- Inside this project directory only
- `data/` for IDE-scoped generated outputs if needed
- Project-local state files (e.g., `.email-monitor-state.json`) must stay inside this directory.

## Execution Interface (Wrapper-first)
- Prefer IDE wrappers when available:
  - `bin/email-monitor` for monitor operations
  - `bin/doctor` after structural changes
- Do NOT assume absolute IDE paths (`/home/...`).
- If a wrapper is missing for an operation, propose adding one (plan-only).

---

# Email & Calendar Integration for OpenClaw

**Location:** `projects/automation/email_calendar/` (authoritative relative path; do not assume `/home/...`)  
**Provider:** Fastmail (JMAP API + CalDAV)  
**Forked from:** [alexdiazdecerio/fastmail-mcp-server](https://github.com/alexdiazdecerio/fastmail-mcp-server)

## Overview

Fastmail integration for email and calendar automation through Jarvis. Handles both personal and Novique.ai company email/calendar.

## Status

**Current Phase:** Phase 4 Complete - All Phases Done

### Phase 1 Progress (January 27, 2026)
- [x] Added `to` filter to `list_emails` tool
- [x] Added `create_draft` tool and handler
- [x] Added `list_drafts` tool and handler
- [x] Added `send_draft` tool and handler
- [x] Added `delete_draft` tool and handler
- [x] Tested all tools via CLI (working)
- [x] Customer classification prompts:
  - `classify_email` - Classify email using Novique.ai rules
  - `customer_inbox_summary` - Summary of customer emails only
  - `draft_customer_reply` - Draft professional reply to customer

### Phase 2 Progress (January 27, 2026)
- [x] Created CalDAV client (`caldav-client.ts`) using tsdav
- [x] Added `list_calendars` tool
- [x] Added `list_events` tool
- [x] Added `get_event` tool
- [x] Added `create_event` tool
- [x] Added `update_event` tool
- [x] Added `delete_event` tool
- [x] Added `todays_schedule` tool
- [x] Added `upcoming_events` tool
- [x] Added calendar prompts:
  - `daily_briefing` - Morning briefing with schedule and emails
  - `schedule_meeting` - Natural language meeting scheduling
  - `reschedule_event` - Natural language event rescheduling
- [x] Tested all calendar tools (working)

### Phase 3 Progress (January 27, 2026)
- [x] Added `detect_scheduling_email` tool - Analyzes emails for scheduling keywords
- [x] Added `email_to_calendar` tool - Extracts scheduling info for event creation
- [x] Added `check_availability` tool - Checks calendar for conflicts at proposed times
- [x] Added email-calendar prompts:
  - `process_scheduling_email` - Full workflow: detect, extract, create event
  - `scan_for_scheduling_emails` - Scan inbox for emails needing calendar entries
- [x] Tested all tools (working)

### Phase 4 Progress (January 27, 2026)
- [x] Created `fastmail-cli` command-line tool for OpenClaw
- [x] CLI provides direct access to all email/calendar functions
- [x] Added documentation to `projects/jarvis/TOOLS.md` (or migrate doc reference to a canonical path within IDE)
- [x] Globally linked via npm (`fastmail-cli` available system-wide)
- [x] Tested CLI commands (working)

## Approach

**Fork and extend fastmail-mcp-server**

The existing MCP server provides solid email functionality. We are adding:
1. Recipient (`to`) filtering for customer detection
2. Draft management (create/list/send drafts)
3. CalDAV calendar integration via `tsdav`
4. Customer classification logic
5. OpenClaw notifications integration

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

## Technical Notes
...

## Email Monitor Service (Wrapper-first)

Automatic email notifications via Telegram every 15 minutes.

Primary interface:

```bash
cd ~/IDE
bin/email-monitor status
bin/email-monitor run
```

Project-local state file (keep here, not elsewhere):
- `.email-monitor-state.json`

---

## BREAK-GLASS (Manual Only)

⚠ These commands bypass the IDE wrapper interface.
Use only when wrappers are broken or when diagnosing wrapper behavior.

```bash
systemctl --user status email-monitor.timer
systemctl --user list-timers email-monitor.timer
systemctl --user start email-monitor.service
systemctl --user disable --now email-monitor.timer
systemctl --user enable --now email-monitor.timer
```
