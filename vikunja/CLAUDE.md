# automation/vikunja — Contract (STRICT)

## Inheritance
This file inherits the IDE constitution at `~/IDE/CLAUDE.md` (STRICT MODE).
If any instruction here conflicts with the constitution, the constitution wins.

## Scope
Vikunja integration under `projects/automation/vikunja/`.

## Allowed Writes
- Inside this project directory only
- `data/` for IDE-scoped generated outputs if needed
- Do not write to laptop-mounted IDE paths from this project.

## Execution Interface (Wrapper-first)
- Prefer IDE wrappers when they exist (or add one via plan-first if missing).
- Do NOT assume absolute IDE paths (`/home/...`).
- After structural changes, run `bin/doctor` (STRICT).

---

# Vikunja Integration

**Location:** `projects/automation/vikunja/` (authoritative relative path; do not assume `/home/...`)  
**Parent Project:** OpenClaw Automation

## Overview

Integration between OpenClaw and Vikunja (project management) running on the workstation.

**Note:** Vikunja handles *project* management. Task management will be a separate integration.

## Vikunja Instance

- **Host:** Workstation (localhost)
- **API URL:** `http://localhost:48060/api`
- **Runtime:** Containers (wrapper-first; avoid direct Podman commands in primary workflow)
- **User:** jarvis@novique.ai

*Note: Migrated from laptop (clay-blade) to workstation on February 1, 2026*

## Integration Goals

| Feature | Description | Status |
|---------|-------------|--------|
| Project sync | Read/write projects from OpenClaw | Planned |
| Project status | Display in desktop_app | Planned |
| Notifications | Alert on milestones/updates | Planned |

## API Access

Vikunja provides a REST API. Documentation: https://vikunja.io/docs/api/

## Development

```bash
cd ~/IDE
set -a
source config/paths.env
set +a
cd "$IDE_ROOT/projects/automation/vikunja"
```

## Notes

- Remove/avoid assumptions about laptop IDE mounts (e.g., `/home/.../laptop-ide`) in this contract.
- If laptop integration is required, document it under a clearly labeled **EXTERNAL** section.

---

**Last Updated:** January 27, 2026
