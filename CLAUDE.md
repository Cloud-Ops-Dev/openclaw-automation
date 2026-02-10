# OpenClaw Automation

**Location:** `/home/clayton/IDE/openclaw/projects/automation/`
**Repository:** https://github.com/Cloud-Ops-Dev/openclaw-automation

## Vision

An administrative assistant powered by Jarvis (OpenClaw) for personal use and for **Novique.ai**. The goal is to automate interactions across multiple platforms and communication channels, creating a unified AI-powered assistant that can:

- Manage communications (email, SMS, phone)
- Interact with CRM and website systems
- Handle routine administrative tasks
- Bridge multiple channels into a single intelligent workflow

## Integration Targets

| Integration | Platform | Description |
|-------------|----------|-------------|
| **Email & Calendar** | Fastmail (JMAP) | Email management + calendar automation |
| **Projects** | Vikunja | Project management (laptop Podman) |
| **Phone/SMS** | Twilio | Voicemails and SMS (stored on website) |
| **CRM** | Website CRM | Customer relationship management |
| **Local Apps** | Various | Desktop application automation |

## Project Structure

```
automation/
├── email_calendar/       # Fastmail email & calendar integration
├── vikunja/              # Vikunja task management integration
├── research/             # Research notes (git-ignored)
└── .planning/            # Planning files (git-ignored)
```

## Subprojects

### email_calendar/
Fastmail integration for email and calendar:
- Classify incoming emails (customer vs other)
- Notify of customer emails
- Draft replies for review and send
- Process scheduling emails → calendar entries
- Appointment notifications and daily briefings
- Natural language calendar management

### vikunja/
Vikunja project management integration:
- Sync projects with OpenClaw
- Display project status in desktop_app
- Milestone notifications
- Runs on laptop (clay-blade) via Podman, accessed over Tailscale

### (Planned) phone_integration/
Twilio integration - handle voicemails and SMS from company phone.

### (Planned) crm_integration/
Website CRM integration - manage customer interactions.

## Status

**Current Phase:** Research & Planning (Email & Calendar Integration)

## Architecture Notes

The Novique.ai website stores:
- Voicemails from Twilio
- SMS messages from Twilio

This creates a potential unified API surface for phone communications.

## Development

```bash
cd /home/clayton/IDE/openclaw/projects/automation
git status
```

---

**Last Updated:** January 27, 2026
