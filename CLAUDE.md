# Clawdbot Automation

**Location:** `/home/clayton/IDE/clawdbot/projects/automation/`
**Repository:** https://github.com/Cloud-Ops-Dev/Clawdbot_Automation

## Vision

An administrative assistant powered by Jarvis (Clawdbot) for personal use and for **Novique.ai**. The goal is to automate interactions across multiple platforms and communication channels, creating a unified AI-powered assistant that can:

- Manage communications (email, SMS, phone)
- Interact with CRM and website systems
- Handle routine administrative tasks
- Bridge multiple channels into a single intelligent workflow

## Integration Targets

| Integration | Platform | Description |
|-------------|----------|-------------|
| **Email** | Fastmail | Read, respond to, and manage emails |
| **Phone/SMS** | Twilio | Voicemails and SMS (stored on website) |
| **CRM** | Website CRM | Customer relationship management |
| **Local Apps** | Various | Desktop application automation |

## Project Structure

```
automation/
├── email_integration/    # Fastmail email integration
├── research/             # Research notes (git-ignored)
└── .planning/            # Planning files (git-ignored)
```

## Subprojects

### email_integration/
Fastmail integration - read, process, and respond to emails through Jarvis.

### (Planned) phone_integration/
Twilio integration - handle voicemails and SMS from company phone.

### (Planned) crm_integration/
Website CRM integration - manage customer interactions.

## Status

**Current Phase:** Research & Planning (Email Integration)

## Architecture Notes

The Novique.ai website stores:
- Voicemails from Twilio
- SMS messages from Twilio

This creates a potential unified API surface for phone communications.

## Development

```bash
cd /home/clayton/IDE/clawdbot/projects/automation
git status
```

---

**Last Updated:** January 27, 2026
