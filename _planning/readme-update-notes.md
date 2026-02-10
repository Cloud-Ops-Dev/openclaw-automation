# README.md Update Notes

Research and drafts for a comprehensive README.md overhaul of the Clawdbot_Automation repo.

**Created:** February 10, 2026

---

## 1. Current README.md Assessment

### What's outdated

| Section | Issue |
|---------|-------|
| Overview bullet list | Lists "Phone/SMS" and "CRM" as if they're part of this repo — Phone/SMS is implemented on novique.ai, CRM is still planned elsewhere |
| "Email & Calendar Integration (In Progress)" | Should be **Phase 4 Complete** — 30+ MCP tools, production systemd timer, CLI |
| "Phone Integration (Planned)" | **Wrong** — fully implemented on novique.ai (admin comms tab: voicemail playback + transcripts, SMS view + reply) |
| "CRM Integration (Planned)" | Still planned, but should clarify it's a separate effort |
| Installation section | Only shows `git clone` — no setup instructions for email_calendar (npm install, .env, etc.) |
| Requirements | Missing: Fastmail app password (for CalDAV), systemd (for email monitor timer) |

### What's missing

- No mention of `fastmail-cli` standalone CLI
- No mention of `@novique/fastmail-mcp-server` (published npm package, public fork)
- No mention of the email monitor systemd timer (15-min cycle)
- No ecosystem context (desktop_app, infrastructure, knowledge_trilium, openplaud, remind)
- No mention of Vikunja infrastructure being running (compose stacks at 48060/48061/48062)
- No architecture diagram or data flow description
- No development workflow section

---

## 2. Ecosystem Inventory

| Component | Repo / Location | Status | Notes |
|-----------|----------------|--------|-------|
| Email & Calendar | This repo (`email_calendar/`) | **Phase 4 Complete** | `@novique/fastmail-mcp-server` v2.0.0, 30+ MCP tools, JMAP email + CalDAV calendar |
| Fastmail MCP Server | [Cloud-Ops-Dev/fastmail-mcp-server](https://github.com/Cloud-Ops-Dev/fastmail-mcp-server) | **Published** | Public fork, npm package `@novique/fastmail-mcp-server` |
| Fastmail CLI | This repo (`email_calendar/bin/fastmail-cli`) | **Production** | Standalone CLI for email & calendar outside MCP context |
| Email Monitor | systemd timer (`email-monitor.service`) | **Production** | Runs every 15 min, sends Telegram/Discord notifications for new email |
| Vikunja Integration | This repo (`vikunja/`) | **Planning** | CLAUDE.md only, no code yet. Infra running (podman compose at 48060/48061/48062) |
| Desktop App | [Cloud-Ops-Dev/desktop_app](https://github.com/Cloud-Ops-Dev/desktop_app) | **Active** | GTK3 dashboard, consumes email/calendar/vikunja data |
| Knowledge/Trilium | [Cloud-Ops-Dev/knowledge_trilium](https://github.com/Cloud-Ops-Dev/knowledge_trilium) | **Active** | TriliumNext ETAPI integration for Discord messages, thread state, NL routing |
| OpenPlaud | [Cloud-Ops-Dev/openplaud](https://github.com/Cloud-Ops-Dev/openplaud) | **DEV** | Voice transcript -> Trilium pipeline (Plaud recorder integration) |
| Infrastructure | [Cloud-Ops-Dev/infrastructure](https://github.com/Cloud-Ops-Dev/infrastructure) | **Active** | Container stacks (Trilium, Vikunja), dev/test/prod envs, seed scripts, integration tests, release manager |
| Remind Scheduler | `~/.openclaw/extensions/` | **Production** | Deterministic reminders, SQLite, multi-target delivery (Telegram/Discord) |
| Phone/SMS (Twilio) | [Cloud-Ops-Dev/novique.ai](https://github.com/Cloud-Ops-Dev/novique.ai) | **Implemented** | Admin comms tab: voicemail playback + transcripts, SMS view + reply |
| CRM | -- | **Planned** | Website CRM integration, no code yet |

---

## 3. Draft Updated Overview Section

```markdown
## Overview

This project provides automation integrations for [OpenClaw](https://github.com/badlogic/openclaw) (Jarvis),
an AI-powered administrative assistant for personal and business use.

### Email & Calendar (Production)

Full Fastmail integration via JMAP (email) and CalDAV (calendar):

- **30+ MCP tools** via `@novique/fastmail-mcp-server` (published npm package)
- **Email management** — read, search, draft, send, delete across all mailboxes
- **Calendar automation** — list calendars, view today/upcoming, create/delete events
- **Scheduling detection** — analyze emails for meeting/scheduling intent
- **Email monitor** — systemd timer checks every 15 min, notifies via Telegram/Discord
- **Standalone CLI** — `fastmail-cli` for direct command-line access outside MCP

### Vikunja Integration (Planning)

Project management integration with Vikunja (self-hosted, running via podman compose):
- Infrastructure ready (ports 48060/48061/48062 across prod/test/dev)
- Integration code not yet written
- Will sync projects, display status in desktop app, send milestone notifications

### Related Ecosystem

| Component | Status | Description |
|-----------|--------|-------------|
| [Desktop App](https://github.com/Cloud-Ops-Dev/desktop_app) | Active | GTK3 dashboard consuming email/calendar/vikunja data |
| [Knowledge/Trilium](https://github.com/Cloud-Ops-Dev/knowledge_trilium) | Active | TriliumNext ETAPI integration |
| [OpenPlaud](https://github.com/Cloud-Ops-Dev/openplaud) | DEV | Voice transcript -> Trilium pipeline |
| [Infrastructure](https://github.com/Cloud-Ops-Dev/infrastructure) | Active | Container stacks, dev/test/prod environments |
| [novique.ai](https://github.com/Cloud-Ops-Dev/novique.ai) | Implemented | Phone/SMS via Twilio (voicemail + SMS in admin panel) |
| Remind Scheduler | Production | Deterministic reminders, multi-target delivery |
```

---

## 4. Related Repo Links

All Cloud-Ops-Dev repos relevant to the automation ecosystem:

- https://github.com/Cloud-Ops-Dev/openclaw-automation (this repo)
- https://github.com/Cloud-Ops-Dev/fastmail-mcp-server (public, npm: @novique/fastmail-mcp-server)
- https://github.com/Cloud-Ops-Dev/desktop_app (GTK3 dashboard)
- https://github.com/Cloud-Ops-Dev/knowledge_trilium (TriliumNext ETAPI)
- https://github.com/Cloud-Ops-Dev/openplaud (Plaud transcript integration)
- https://github.com/Cloud-Ops-Dev/infrastructure (container stacks, environments)
- https://github.com/Cloud-Ops-Dev/novique.ai (business website, Twilio phone/SMS)

---

## 5. GitHub Repo Rename (DONE)

**Renamed:** `Clawdbot_Automation` → `openclaw-automation` (February 10, 2026)

Completed steps:
1. Renamed on GitHub via `gh repo rename`
2. Updated local remote to `https://github.com/Cloud-Ops-Dev/openclaw-automation.git`
3. Updated README.md clone URL
4. Updated CLAUDE.md repository URL
5. GitHub auto-redirects old URL

---

## 6. Key Facts for Updated README

- `email_calendar` is **production-ready** with 30+ tools (JMAP email + CalDAV calendar)
- Email monitor runs every 15 min via systemd timer, sends Telegram/Discord notifications
- `fastmail-cli` provides standalone CLI access outside MCP
- Phone/SMS (Twilio) is **fully implemented** on novique.ai — admin comms tab provides voicemail playback + transcripts, SMS viewing and reply. Current README incorrectly lists this as "Planned"
- Vikunja infrastructure is running (podman compose stacks at ports 48060/48061/48062) but integration code is not yet written
- Desktop app already consumes Fastmail and Vikunja data
- Infrastructure repo provides dev/test/prod environment isolation with seed scripts and integration tests
- The remind service (`openclaw-remind`) is production-ready and active
- CRM integration is still genuinely planned (no code exists)
