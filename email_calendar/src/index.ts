#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import { FastmailClient } from './fastmail-client.js';
import { EmailAnalyticsEngine } from './email-analytics.js';
import { FastmailCalendarClient } from './caldav-client.js';

// Load environment variables
dotenv.config();

// Validate environment variables
const email = process.env.FASTMAIL_EMAIL;
const apiToken = process.env.FASTMAIL_API_TOKEN;
const appPassword = process.env.FASTMAIL_APP_PASSWORD;

if (!email || !apiToken) {
  console.error('Error: Missing required environment variables');
  console.error('Please set FASTMAIL_EMAIL and FASTMAIL_API_TOKEN in your .env file');
  console.error('See .env.example for details');
  process.exit(1);
}

// Note: appPassword is optional - only needed for calendar features
if (!appPassword) {
  console.error('Warning: FASTMAIL_APP_PASSWORD not set - calendar features will be disabled');
}

// Create Fastmail client
const fastmail = new FastmailClient(email, apiToken);

// Create Analytics engine
const analytics = new EmailAnalyticsEngine(fastmail);

// Create Calendar client (optional - only if app password provided)
const calendar = appPassword ? new FastmailCalendarClient(email, appPassword) : null;

// Create MCP server
const server = new Server({
  name: 'fastmail-mcp',
  version: '0.1.0'
}, {
  capabilities: {
    tools: {},
    prompts: {}
  }
});

// Initialize clients when server starts
let initialized = false;
let calendarInitialized = false;

async function ensureInitialized() {
  if (!initialized) {
    try {
      await fastmail.initialize();
      initialized = true;
      console.error('Fastmail client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Fastmail client:', error);
      throw error;
    }
  }
}

async function ensureCalendarInitialized() {
  await ensureInitialized();
  if (!calendarInitialized && calendar) {
    try {
      await calendar.initialize();
      calendarInitialized = true;
      console.error('Calendar client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Calendar client:', error);
      throw error;
    }
  }
  if (!calendar) {
    throw new Error('Calendar features disabled - FASTMAIL_APP_PASSWORD not configured');
  }
}

// Define Zod schemas for requests
const ToolsListRequestSchema = z.object({
  method: z.literal('tools/list')
});

const ToolsCallRequestSchema = z.object({
  method: z.literal('tools/call'),
  params: z.object({
    name: z.string(),
    arguments: z.any().optional()
  })
});

const PromptsListRequestSchema = z.object({
  method: z.literal('prompts/list')
});

const PromptsGetRequestSchema = z.object({
  method: z.literal('prompts/get'),
  params: z.object({
    name: z.string(),
    arguments: z.any().optional()
  })
});

// Tools list handler
server.setRequestHandler(ToolsListRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_mailboxes',
        description: 'List all email folders/mailboxes in your Fastmail account',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'list_emails',
        description: 'List emails from your Fastmail account with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            mailboxId: { type: 'string', description: 'ID of the mailbox to list emails from' },
            limit: { type: 'number', description: 'Maximum number of emails to return (default: 50)' },
            isUnread: { type: 'boolean', description: 'Filter for unread emails only' },
            searchText: { type: 'string', description: 'Search for emails containing this text' },
            from: { type: 'string', description: 'Filter emails from this sender' },
            to: { type: 'string', description: 'Filter emails sent TO this address (e.g., sales@novique.ai)' },
            subject: { type: 'string', description: 'Filter emails with this subject' }
          }
        }
      },
      {
        name: 'get_email',
        description: 'Get full details of a specific email including body content',
        inputSchema: {
          type: 'object',
          properties: {
            emailId: { type: 'string', description: 'The ID of the email to retrieve' }
          },
          required: ['emailId']
        }
      },
      {
        name: 'send_email',
        description: 'Send a new email',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  name: { type: 'string' }
                },
                required: ['email']
              },
              description: 'Recipients'
            },
            cc: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  name: { type: 'string' }
                },
                required: ['email']
              },
              description: 'CC recipients'
            },
            bcc: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  name: { type: 'string' }
                },
                required: ['email']
              },
              description: 'BCC recipients'
            },
            subject: { type: 'string', description: 'Email subject' },
            textBody: { type: 'string', description: 'Plain text body' },
            htmlBody: { type: 'string', description: 'HTML body' },
            inReplyTo: { type: 'string', description: 'Email ID this is replying to' }
          },
          required: ['to', 'subject']
        }
      },
      {
        name: 'mark_email_read',
        description: 'Mark an email as read or unread',
        inputSchema: {
          type: 'object',
          properties: {
            emailId: { type: 'string', description: 'The ID of the email' },
            read: { type: 'boolean', description: 'True to mark as read, false to mark as unread' }
          },
          required: ['emailId', 'read']
        }
      },
      {
        name: 'move_email',
        description: 'Move an email to a different mailbox/folder',
        inputSchema: {
          type: 'object',
          properties: {
            emailId: { type: 'string', description: 'The ID of the email to move' },
            targetMailboxId: { type: 'string', description: 'The ID of the target mailbox' }
          },
          required: ['emailId', 'targetMailboxId']
        }
      },
      {
        name: 'delete_email',
        description: 'Permanently delete an email',
        inputSchema: {
          type: 'object',
          properties: {
            emailId: { type: 'string', description: 'The ID of the email to delete' }
          },
          required: ['emailId']
        }
      },
      {
        name: 'search_emails',
        description: 'Search for emails containing specific text',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Maximum number of results (default: 50)' }
          },
          required: ['query']
        }
      },
      // 📝 DRAFT MANAGEMENT TOOLS
      {
        name: 'create_draft',
        description: 'Create an email draft for review before sending',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  name: { type: 'string' }
                },
                required: ['email']
              },
              description: 'Recipients'
            },
            cc: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  name: { type: 'string' }
                },
                required: ['email']
              },
              description: 'CC recipients'
            },
            bcc: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  name: { type: 'string' }
                },
                required: ['email']
              },
              description: 'BCC recipients'
            },
            subject: { type: 'string', description: 'Email subject' },
            textBody: { type: 'string', description: 'Plain text body' },
            htmlBody: { type: 'string', description: 'HTML body' },
            inReplyTo: { type: 'string', description: 'Email ID this is replying to' }
          },
          required: ['to', 'subject']
        }
      },
      {
        name: 'list_drafts',
        description: 'List all email drafts',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of drafts to return (default: 50)' }
          }
        }
      },
      {
        name: 'send_draft',
        description: 'Send an existing email draft',
        inputSchema: {
          type: 'object',
          properties: {
            draftId: { type: 'string', description: 'The ID of the draft email to send' }
          },
          required: ['draftId']
        }
      },
      {
        name: 'delete_draft',
        description: 'Delete an email draft',
        inputSchema: {
          type: 'object',
          properties: {
            draftId: { type: 'string', description: 'The ID of the draft to delete' }
          },
          required: ['draftId']
        }
      },
      // 📊 ANALYTICS TOOLS
      {
        name: 'generate_email_analytics',
        description: 'Generate comprehensive email analytics and insights for a specified period',
        inputSchema: {
          type: 'object',
          properties: {
            days: { type: 'number', description: 'Number of days to analyze (default: 30)' },
            maxEmails: { type: 'number', description: 'Maximum number of emails to analyze (default: 1000)' },
            includeContent: { type: 'boolean', description: 'Include content analysis (default: true)' }
          }
        }
      },
      {
        name: 'get_email_volume_stats',
        description: 'Get email volume statistics (sent/received counts) for a period',
        inputSchema: {
          type: 'object',
          properties: {
            days: { type: 'number', description: 'Number of days to analyze (default: 30)' }
          }
        }
      },
      {
        name: 'get_top_senders',
        description: 'Get top email senders analysis with counts and percentages',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of top senders to return (default: 10)' },
            days: { type: 'number', description: 'Number of days to analyze (default: 30)' }
          }
        }
      },
      {
        name: 'get_activity_patterns',
        description: 'Get email activity patterns by hour, day, and month',
        inputSchema: {
          type: 'object',
          properties: {
            days: { type: 'number', description: 'Number of days to analyze (default: 30)' }
          }
        }
      },
      {
        name: 'generate_email_report',
        description: 'Generate a comprehensive email analytics report with insights and recommendations',
        inputSchema: {
          type: 'object',
          properties: {
            days: { type: 'number', description: 'Number of days to analyze (default: 30)' }
          }
        }
      },
      // 📅 CALENDAR TOOLS
      {
        name: 'list_calendars',
        description: 'List all calendars in your Fastmail account',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'list_events',
        description: 'List calendar events within a date range',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: { type: 'string', description: 'ID of the calendar (optional - defaults to all calendars)' },
            startDate: { type: 'string', description: 'Start date in ISO format (e.g., 2026-01-27)' },
            endDate: { type: 'string', description: 'End date in ISO format (e.g., 2026-01-31)' }
          },
          required: ['startDate', 'endDate']
        }
      },
      {
        name: 'get_event',
        description: 'Get full details of a specific calendar event',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: { type: 'string', description: 'ID of the calendar containing the event' },
            eventUrl: { type: 'string', description: 'URL of the event to retrieve' }
          },
          required: ['calendarId', 'eventUrl']
        }
      },
      {
        name: 'create_event',
        description: 'Create a new calendar event',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: { type: 'string', description: 'ID of the calendar to add the event to' },
            summary: { type: 'string', description: 'Event title/summary' },
            description: { type: 'string', description: 'Event description (optional)' },
            location: { type: 'string', description: 'Event location (optional)' },
            start: { type: 'string', description: 'Start date/time in ISO format (e.g., 2026-01-27T10:00:00)' },
            end: { type: 'string', description: 'End date/time in ISO format (e.g., 2026-01-27T11:00:00)' },
            allDay: { type: 'boolean', description: 'Is this an all-day event? (default: false)' },
            attendees: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  name: { type: 'string' }
                },
                required: ['email']
              },
              description: 'Event attendees (optional)'
            }
          },
          required: ['calendarId', 'summary', 'start', 'end']
        }
      },
      {
        name: 'update_event',
        description: 'Update an existing calendar event (reschedule, change details)',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: { type: 'string', description: 'ID of the calendar containing the event' },
            eventUrl: { type: 'string', description: 'URL of the event to update' },
            summary: { type: 'string', description: 'New event title (optional)' },
            description: { type: 'string', description: 'New event description (optional)' },
            location: { type: 'string', description: 'New event location (optional)' },
            start: { type: 'string', description: 'New start date/time in ISO format (optional)' },
            end: { type: 'string', description: 'New end date/time in ISO format (optional)' },
            allDay: { type: 'boolean', description: 'Change to all-day event? (optional)' }
          },
          required: ['calendarId', 'eventUrl']
        }
      },
      {
        name: 'delete_event',
        description: 'Delete/cancel a calendar event',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: { type: 'string', description: 'ID of the calendar containing the event' },
            eventUrl: { type: 'string', description: 'URL of the event to delete' }
          },
          required: ['calendarId', 'eventUrl']
        }
      },
      {
        name: 'todays_schedule',
        description: 'Get all events scheduled for today',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'upcoming_events',
        description: 'Get upcoming events for the next N days',
        inputSchema: {
          type: 'object',
          properties: {
            days: { type: 'number', description: 'Number of days to look ahead (default: 7)' }
          }
        }
      },
      // 📧📅 EMAIL-CALENDAR INTEGRATION TOOLS
      {
        name: 'detect_scheduling_email',
        description: 'Analyze an email to detect if it contains scheduling intent (meeting requests, availability discussions, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            emailId: { type: 'string', description: 'ID of the email to analyze' }
          },
          required: ['emailId']
        }
      },
      {
        name: 'email_to_calendar',
        description: 'Extract scheduling information from an email and create a calendar event',
        inputSchema: {
          type: 'object',
          properties: {
            emailId: { type: 'string', description: 'ID of the email containing scheduling information' },
            calendarId: { type: 'string', description: 'ID of the calendar to add the event to (optional - uses default)' },
            confirm: { type: 'boolean', description: 'If true, create the event. If false, return preview only (default: false)' }
          },
          required: ['emailId']
        }
      },
      {
        name: 'check_availability',
        description: 'Check calendar availability for proposed meeting times',
        inputSchema: {
          type: 'object',
          properties: {
            proposedTimes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  start: { type: 'string', description: 'Proposed start time in ISO format' },
                  end: { type: 'string', description: 'Proposed end time in ISO format' }
                },
                required: ['start', 'end']
              },
              description: 'List of proposed time slots to check'
            }
          },
          required: ['proposedTimes']
        }
      }
    ]
  };
});

// Tools call handler
server.setRequestHandler(ToolsCallRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    await ensureInitialized();

    switch (name) {
      case 'list_mailboxes': {
        const mailboxes = await fastmail.getMailboxes();
        
        const formattedMailboxes = mailboxes.map(mb => ({
          id: mb.id,
          name: mb.name,
          role: mb.role,
          totalEmails: mb.totalEmails,
          unreadEmails: mb.unreadEmails,
          path: mb.name
        }));
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(formattedMailboxes, null, 2)
          }]
        };
      }

      case 'list_emails': {
        const filter: any = {};
        
        if (args.isUnread !== undefined) filter.isUnread = args.isUnread;
        if (args.searchText) filter.text = args.searchText;
        if (args.from) filter.from = args.from;
        if (args.to) filter.to = args.to;
        if (args.subject) filter.subject = args.subject;
        
        const { emails, total } = await fastmail.getEmails({
          mailboxId: args.mailboxId,
          limit: args.limit || 50,
          filter: Object.keys(filter).length > 0 ? filter : undefined
        });
        
        const formattedEmails = emails.map(email => ({
          id: email.id,
          subject: email.subject || '(no subject)',
          from: email.from?.[0] || { email: 'unknown', name: 'Unknown' },
          to: email.to,
          receivedAt: email.receivedAt,
          preview: email.preview,
          hasAttachment: email.hasAttachment,
          isRead: email.keywords['$seen'] || false,
          isFlagged: email.keywords['$flagged'] || false
        }));
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              total,
              count: emails.length,
              emails: formattedEmails
            }, null, 2)
          }]
        };
      }

      case 'get_email': {
        const { emailId } = args;
        const email = await fastmail.getEmail(emailId);
        
        if (!email) {
          return {
            content: [{
              type: 'text',
              text: 'Email not found'
            }],
            isError: true
          };
        }
        
        // Extract text body
        let textBody = '';
        if (email.textBody && email.textBody.length > 0 && email.bodyValues) {
          const textPartId = email.textBody[0].partId;
          textBody = email.bodyValues[textPartId]?.value || '';
        }
        
        // Extract HTML body
        let htmlBody = '';
        if (email.htmlBody && email.htmlBody.length > 0 && email.bodyValues) {
          const htmlPartId = email.htmlBody[0].partId;
          htmlBody = email.bodyValues[htmlPartId]?.value || '';
        }
        
        const formattedEmail = {
          id: email.id,
          subject: email.subject || '(no subject)',
          from: email.from?.[0] || { email: 'unknown', name: 'Unknown' },
          to: email.to,
          cc: email.cc,
          bcc: email.bcc,
          receivedAt: email.receivedAt,
          sentAt: email.sentAt,
          textBody: textBody,
          htmlBody: htmlBody,
          hasAttachment: email.hasAttachment,
          attachments: email.attachments?.map(att => ({
            name: att.name,
            type: att.type,
            size: att.size,
            blobId: att.blobId
          })),
          isRead: email.keywords['$seen'] || false,
          isFlagged: email.keywords['$flagged'] || false,
          threadId: email.threadId
        };
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(formattedEmail, null, 2)
          }]
        };
      }

      case 'send_email': {
        if (!args.textBody && !args.htmlBody) {
          return {
            content: [{
              type: 'text',
              text: 'Error: Must provide either textBody or htmlBody'
            }],
            isError: true
          };
        }
        
        const result = await fastmail.sendEmail(args);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              emailId: result.emailId,
              sentAt: result.sentAt
            }, null, 2)
          }]
        };
      }

      case 'mark_email_read': {
        const { emailId, read } = args;
        await fastmail.markAsRead(emailId, read);
        
        return {
          content: [{
            type: 'text',
            text: `Email marked as ${read ? 'read' : 'unread'}`
          }]
        };
      }

      case 'move_email': {
        const { emailId, targetMailboxId } = args;
        await fastmail.moveEmail(emailId, targetMailboxId);
        
        return {
          content: [{
            type: 'text',
            text: 'Email moved successfully'
          }]
        };
      }

      case 'delete_email': {
        const { emailId } = args;
        await fastmail.deleteEmail(emailId);
        
        return {
          content: [{
            type: 'text',
            text: 'Email deleted successfully'
          }]
        };
      }

      case 'search_emails': {
        const { query, limit } = args;
        const { emails, total } = await fastmail.searchEmails(query, limit);
        
        const formattedEmails = emails.map(email => ({
          id: email.id,
          subject: email.subject || '(no subject)',
          from: email.from?.[0] || { email: 'unknown', name: 'Unknown' },
          receivedAt: email.receivedAt,
          preview: email.preview,
          isRead: email.keywords['$seen'] || false
        }));
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              total,
              count: emails.length,
              query,
              emails: formattedEmails
            }, null, 2)
          }]
        };
      }

      // 📝 DRAFT MANAGEMENT HANDLERS
      case 'create_draft': {
        if (!args.textBody && !args.htmlBody) {
          return {
            content: [{
              type: 'text',
              text: 'Error: Must provide either textBody or htmlBody'
            }],
            isError: true
          };
        }

        const result = await fastmail.createDraft(args);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              draftId: result.draftId,
              message: 'Draft created successfully. Use send_draft to send it.'
            }, null, 2)
          }]
        };
      }

      case 'list_drafts': {
        const { drafts, total } = await fastmail.listDrafts(args.limit || 50);

        const formattedDrafts = drafts.map(draft => ({
          id: draft.id,
          subject: draft.subject || '(no subject)',
          to: draft.to,
          cc: draft.cc,
          receivedAt: draft.receivedAt,
          preview: draft.preview
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              total,
              count: drafts.length,
              drafts: formattedDrafts
            }, null, 2)
          }]
        };
      }

      case 'send_draft': {
        const { draftId } = args;
        const result = await fastmail.sendDraft(draftId);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              emailId: result.emailId,
              sentAt: result.sentAt
            }, null, 2)
          }]
        };
      }

      case 'delete_draft': {
        const { draftId } = args;
        await fastmail.deleteDraft(draftId);

        return {
          content: [{
            type: 'text',
            text: 'Draft deleted successfully'
          }]
        };
      }

      // 📊 ANALYTICS TOOLS HANDLERS
      case 'generate_email_analytics': {
        const { days = 30, maxEmails = 1000, includeContent = true } = args;
        
        const analyticsData = await analytics.generateAnalytics({
          startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          maxEmails,
          includeContent
        });
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(analyticsData, null, 2)
          }]
        };
      }

      case 'get_email_volume_stats': {
        const { days = 30 } = args;
        const volumeStats = await analytics.getVolumeAnalytics(days);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(volumeStats, null, 2)
          }]
        };
      }

      case 'get_top_senders': {
        const { limit = 10, days = 30 } = args;
        const topSenders = await analytics.getTopSenders(limit, days);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(topSenders, null, 2)
          }]
        };
      }

      case 'get_activity_patterns': {
        const { days = 30 } = args;
        const patterns = await analytics.getActivityPatterns(days);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(patterns, null, 2)
          }]
        };
      }

      case 'generate_email_report': {
        const { days = 30 } = args;
        const report = await analytics.generateEmailReport(days);

        return {
          content: [{
            type: 'text',
            text: report
          }]
        };
      }

      // 📅 CALENDAR TOOLS HANDLERS
      case 'list_calendars': {
        await ensureCalendarInitialized();
        const calendars = await calendar!.listCalendars();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(calendars, null, 2)
          }]
        };
      }

      case 'list_events': {
        await ensureCalendarInitialized();
        const { calendarId, startDate, endDate } = args;

        const events = await calendar!.listEvents({
          calendarId,
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        });

        const formattedEvents = events.map(event => ({
          id: event.id,
          url: event.url,
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: event.start.toISOString(),
          end: event.end.toISOString(),
          allDay: event.allDay,
          status: event.status
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              count: events.length,
              events: formattedEvents
            }, null, 2)
          }]
        };
      }

      case 'get_event': {
        await ensureCalendarInitialized();
        const { calendarId, eventUrl } = args;

        const event = await calendar!.getEvent(calendarId, eventUrl);

        if (!event) {
          return {
            content: [{
              type: 'text',
              text: 'Event not found'
            }],
            isError: true
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              id: event.id,
              uid: event.uid,
              url: event.url,
              summary: event.summary,
              description: event.description,
              location: event.location,
              start: event.start.toISOString(),
              end: event.end.toISOString(),
              allDay: event.allDay,
              status: event.status
            }, null, 2)
          }]
        };
      }

      case 'create_event': {
        await ensureCalendarInitialized();
        const { calendarId, summary, description, location, start, end, allDay, attendees } = args;

        const result = await calendar!.createEvent({
          calendarId,
          summary,
          description,
          location,
          start: new Date(start),
          end: new Date(end),
          allDay: allDay || false,
          attendees
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              eventUrl: result.eventUrl,
              uid: result.uid,
              message: 'Event created successfully'
            }, null, 2)
          }]
        };
      }

      case 'update_event': {
        await ensureCalendarInitialized();
        const { calendarId, eventUrl, summary, description, location, start, end, allDay } = args;

        await calendar!.updateEvent({
          calendarId,
          eventUrl,
          summary,
          description,
          location,
          start: start ? new Date(start) : undefined,
          end: end ? new Date(end) : undefined,
          allDay
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Event updated successfully'
            }, null, 2)
          }]
        };
      }

      case 'delete_event': {
        await ensureCalendarInitialized();
        const { calendarId, eventUrl } = args;

        await calendar!.deleteEvent(calendarId, eventUrl);

        return {
          content: [{
            type: 'text',
            text: 'Event deleted successfully'
          }]
        };
      }

      case 'todays_schedule': {
        await ensureCalendarInitialized();
        const events = await calendar!.getTodaysEvents();

        const formattedEvents = events.map(event => ({
          summary: event.summary,
          location: event.location,
          start: event.start.toISOString(),
          end: event.end.toISOString(),
          allDay: event.allDay,
          url: event.url,
          calendarId: event.id.split('/').slice(0, -1).join('/')
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              date: new Date().toISOString().split('T')[0],
              count: events.length,
              events: formattedEvents
            }, null, 2)
          }]
        };
      }

      case 'upcoming_events': {
        await ensureCalendarInitialized();
        const { days = 7 } = args;
        const events = await calendar!.getUpcomingEvents(days);

        const formattedEvents = events.map(event => ({
          summary: event.summary,
          location: event.location,
          start: event.start.toISOString(),
          end: event.end.toISOString(),
          allDay: event.allDay,
          url: event.url,
          calendarId: event.id.split('/').slice(0, -1).join('/')
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              days,
              count: events.length,
              events: formattedEvents
            }, null, 2)
          }]
        };
      }

      // 📧📅 EMAIL-CALENDAR INTEGRATION HANDLERS
      case 'detect_scheduling_email': {
        await ensureInitialized();
        const { emailId } = args;

        const email = await fastmail.getEmail(emailId);
        if (!email) {
          return {
            content: [{
              type: 'text',
              text: 'Email not found'
            }],
            isError: true
          };
        }

        // Extract text content
        let textContent = '';
        if (email.textBody && email.textBody.length > 0 && email.bodyValues) {
          const textPartId = email.textBody[0].partId;
          textContent = email.bodyValues[textPartId]?.value || '';
        }

        const subject = email.subject || '';
        const fullText = `${subject}\n${textContent}`.toLowerCase();

        // Scheduling keywords
        const schedulingKeywords = [
          'schedule', 'meeting', 'call', 'appointment', 'calendar',
          'available', 'availability', 'free time', 'slot',
          'book', 'reserve', 'set up', 'arrange',
          'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
          'morning', 'afternoon', 'evening',
          'am', 'pm', 'o\'clock', ':00', ':30',
          'next week', 'this week', 'tomorrow', 'today',
          'zoom', 'teams', 'google meet', 'video call', 'phone call',
          'let\'s meet', 'can we meet', 'would like to meet',
          'discuss', 'chat', 'talk', 'connect', 'catch up',
          'propose', 'suggest', 'how about', 'does .* work'
        ];

        // Time patterns
        const timePatterns = [
          /\d{1,2}:\d{2}\s*(am|pm)?/i,
          /\d{1,2}\s*(am|pm)/i,
          /\d{1,2}(st|nd|rd|th)?\s*(of)?\s*(january|february|march|april|may|june|july|august|september|october|november|december)/i,
          /(january|february|march|april|may|june|july|august|september|october|november|december)\s*\d{1,2}/i,
          /\d{1,2}\/\d{1,2}(\/\d{2,4})?/
        ];

        const foundKeywords = schedulingKeywords.filter(kw => {
          if (kw.includes('.*')) {
            return new RegExp(kw).test(fullText);
          }
          return fullText.includes(kw);
        });

        const foundTimePatterns = timePatterns.filter(pattern => pattern.test(fullText));

        const hasSchedulingIntent = foundKeywords.length >= 2 ||
          (foundKeywords.length >= 1 && foundTimePatterns.length >= 1);

        // Determine confidence
        let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
        if (foundKeywords.length >= 3 && foundTimePatterns.length >= 1) {
          confidence = 'HIGH';
        } else if (foundKeywords.length >= 2 || foundTimePatterns.length >= 1) {
          confidence = 'MEDIUM';
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              emailId,
              subject: email.subject,
              from: email.from?.[0],
              hasSchedulingIntent,
              confidence,
              analysis: {
                keywordsFound: foundKeywords,
                timeReferencesFound: foundTimePatterns.length > 0,
                keywordCount: foundKeywords.length
              },
              recommendation: hasSchedulingIntent
                ? 'This email appears to contain scheduling content. Use email_to_calendar to extract and create an event.'
                : 'This email does not appear to contain scheduling content.'
            }, null, 2)
          }]
        };
      }

      case 'email_to_calendar': {
        await ensureInitialized();
        const { emailId, calendarId, confirm = false } = args;

        const email = await fastmail.getEmail(emailId);
        if (!email) {
          return {
            content: [{
              type: 'text',
              text: 'Email not found'
            }],
            isError: true
          };
        }

        // Extract text content
        let textContent = '';
        if (email.textBody && email.textBody.length > 0 && email.bodyValues) {
          const textPartId = email.textBody[0].partId;
          textContent = email.bodyValues[textPartId]?.value || '';
        }

        // This returns extracted info - actual parsing would need AI
        // For now, return the email content for AI to parse
        const extractedInfo = {
          emailId,
          subject: email.subject,
          from: email.from?.[0],
          to: email.to,
          receivedAt: email.receivedAt,
          textContent: textContent.substring(0, 2000), // Limit for context
          suggestedTitle: `Meeting: ${email.subject}`,
          suggestedAttendees: email.from ? [email.from[0]] : []
        };

        if (confirm && calendar) {
          // If confirming, we need parsed date/time - return instruction
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                status: 'needs_parsing',
                message: 'To create an event, use the schedule_meeting prompt or create_event tool with specific date/time extracted from this email.',
                extractedInfo,
                instruction: 'Parse the email content to extract: 1) Meeting date/time, 2) Duration, 3) Location/call link, 4) Attendees. Then use create_event with those details.'
              }, null, 2)
            }]
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'preview',
              extractedInfo,
              instruction: 'Review this email content and use create_event to schedule if appropriate. Set confirm=true after parsing date/time details.'
            }, null, 2)
          }]
        };
      }

      case 'check_availability': {
        await ensureCalendarInitialized();
        const { proposedTimes } = args;

        const results = [];

        for (const slot of proposedTimes) {
          const start = new Date(slot.start);
          const end = new Date(slot.end);

          // Get events during this time
          const events = await calendar!.listEvents({
            startDate: start,
            endDate: end
          });

          const conflicts = events.filter(event => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            // Check for overlap
            return eventStart < end && eventEnd > start;
          });

          results.push({
            proposedStart: slot.start,
            proposedEnd: slot.end,
            available: conflicts.length === 0,
            conflicts: conflicts.map(c => ({
              summary: c.summary,
              start: c.start.toISOString(),
              end: c.end.toISOString()
            }))
          });
        }

        const availableSlots = results.filter(r => r.available);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              totalSlots: proposedTimes.length,
              availableSlots: availableSlots.length,
              results
            }, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
});

// Prompts list handler
server.setRequestHandler(PromptsListRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'inbox_summary',
        description: 'Get a summary of unread emails in the inbox'
      },
      {
        name: 'compose_reply',
        description: 'Compose a reply to an email',
        arguments: [
          {
            name: 'emailId',
            description: 'ID of the email to reply to',
            required: true
          },
          {
            name: 'tone',
            description: 'Tone of the reply',
            required: true
          }
        ]
      },
      // Customer classification prompts
      {
        name: 'classify_email',
        description: 'Classify an email as customer, vendor, newsletter, or other. Uses Novique.ai customer identification rules.',
        arguments: [
          {
            name: 'emailId',
            description: 'ID of the email to classify',
            required: true
          }
        ]
      },
      {
        name: 'customer_inbox_summary',
        description: 'Get a summary of emails from customers only (sent to sales@novique.ai, support@novique.ai, or identified as customer communications)'
      },
      {
        name: 'draft_customer_reply',
        description: 'Draft a professional reply to a customer email for review before sending',
        arguments: [
          {
            name: 'emailId',
            description: 'ID of the customer email to reply to',
            required: true
          },
          {
            name: 'context',
            description: 'Additional context or instructions for the reply (optional)',
            required: false
          }
        ]
      },
      // Calendar prompts
      {
        name: 'daily_briefing',
        description: 'Get a morning briefing of today\'s schedule and upcoming events'
      },
      {
        name: 'schedule_meeting',
        description: 'Schedule a new meeting/call using natural language',
        arguments: [
          {
            name: 'request',
            description: 'Natural language scheduling request (e.g., "Schedule a call with John for Friday at 3pm")',
            required: true
          }
        ]
      },
      {
        name: 'reschedule_event',
        description: 'Reschedule an existing event using natural language',
        arguments: [
          {
            name: 'request',
            description: 'Natural language reschedule request (e.g., "Move today\'s 9am call to tomorrow at 10am")',
            required: true
          }
        ]
      },
      // Email-Calendar Integration Prompts
      {
        name: 'process_scheduling_email',
        description: 'Process an email that contains scheduling content and create appropriate calendar events',
        arguments: [
          {
            name: 'emailId',
            description: 'ID of the email to process',
            required: true
          }
        ]
      },
      {
        name: 'scan_for_scheduling_emails',
        description: 'Scan recent customer emails for scheduling requests that need calendar entries'
      }
    ]
  };
});

// Prompts get handler
server.setRequestHandler(PromptsGetRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  switch (name) {
    case 'inbox_summary':
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: 'Please give me a summary of my unread emails in the inbox. List the sender, subject, and a brief preview for each.'
          }
        }]
      };

    case 'compose_reply': {
      const { emailId, tone } = args;
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Please help me compose a ${tone} reply to the email with ID ${emailId}. First, get the email details to understand the context, then draft an appropriate response.`
          }
        }]
      };
    }

    // Customer classification prompts
    case 'classify_email': {
      const { emailId } = args;
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Classify the email with ID ${emailId} using these Novique.ai customer identification rules:

**AUTOMATIC CUSTOMER (no analysis needed):**
- Email sent TO sales@novique.ai → CUSTOMER
- Email sent TO support@novique.ai → CUSTOMER

**REQUIRES ANALYSIS:**
- Email sent TO other @novique.ai addresses → Analyze content to determine if customer

**Classification categories:**
1. CUSTOMER - Current or potential customer inquiry, support request, or business communication
2. VENDOR - Service provider, supplier, or business partner communication
3. NEWSLETTER - Marketing emails, newsletters, automated notifications
4. INTERNAL - Team communication (if applicable)
5. SPAM - Unsolicited or suspicious email
6. OTHER - Doesn't fit above categories

First, use get_email to retrieve the full email details, then provide:
1. Classification category
2. Confidence level (HIGH/MEDIUM/LOW)
3. Brief reasoning
4. Recommended action (reply needed, archive, delete, etc.)`
          }
        }]
      };
    }

    case 'customer_inbox_summary': {
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Provide a summary of customer emails for Novique.ai.

**Step 1:** Use list_emails with these filters to find customer emails:
- First, check emails TO sales@novique.ai (always customers)
- Then, check emails TO support@novique.ai (always customers)
- Finally, check other unread emails and classify any that appear to be customer inquiries

**Step 2:** For each customer email found, provide:
- Sender name and email
- Subject
- Brief preview/summary
- Priority assessment (HIGH/MEDIUM/LOW)
- Whether a response is needed

**Step 3:** Summarize:
- Total customer emails found
- How many need responses
- Any urgent items requiring immediate attention

Focus only on genuine customer communications, not newsletters or automated notifications.`
          }
        }]
      };
    }

    case 'draft_customer_reply': {
      const { emailId, context } = args;
      const contextNote = context ? `\n\nAdditional context from user: ${context}` : '';
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Draft a professional reply to the customer email with ID ${emailId}.${contextNote}

**Step 1:** Use get_email to retrieve the full email details.

**Step 2:** Analyze the email to understand:
- What the customer is asking or needs
- Their tone and urgency level
- Any specific questions that need answering

**Step 3:** Draft a reply that:
- Is professional and friendly
- Addresses all their questions/concerns
- Represents Novique.ai appropriately
- Includes appropriate greeting and sign-off
- Is concise but complete

**Step 4:** Use create_draft to save the reply as a draft with:
- Proper recipient (reply to sender)
- Subject: "Re: [original subject]"
- The drafted reply text

**Step 5:** Return:
- Summary of original email
- The draft reply text
- The draft ID so it can be reviewed and sent
- Any notes or suggestions for the human reviewer`
          }
        }]
      };
    }

    // Calendar prompts
    case 'daily_briefing': {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Provide a morning briefing for ${today}.

**Step 1:** Use todays_schedule to get today's events.

**Step 2:** Use upcoming_events with days=3 to see what's coming up.

**Step 3:** Use customer_inbox_summary to check for customer emails needing attention.

**Step 4:** Provide a briefing that includes:

📅 **Today's Schedule**
- List each event with time, title, and location
- Note any conflicts or back-to-back meetings
- Highlight any important meetings

📬 **Email Summary**
- Number of unread customer emails
- Any urgent items needing response

📆 **Coming Up (Next 3 Days)**
- Key events to prepare for
- Any deadlines approaching

💡 **Recommendations**
- Suggested priorities for the day
- Any items needing immediate attention`
          }
        }]
      };
    }

    case 'schedule_meeting': {
      const { request } = args;
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Schedule a meeting based on this request: "${request}"

**Step 1:** Parse the request to extract:
- Event title/summary
- Date and time (convert relative dates like "Friday" to actual dates)
- Duration (default to 1 hour if not specified)
- Location (if mentioned)
- Attendees (if mentioned)

**Step 2:** Use list_calendars to see available calendars and select the appropriate one (usually the primary/default calendar).

**Step 3:** Check for conflicts by using list_events for the proposed time slot.

**Step 4:** If no conflicts, use create_event to schedule the meeting with:
- The extracted details
- Appropriate start and end times in ISO format

**Step 5:** Return:
- Confirmation of what was scheduled
- Event details (date, time, duration)
- The event URL for reference
- Note any conflicts that were detected`
          }
        }]
      };
    }

    case 'reschedule_event': {
      const { request } = args;
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Reschedule an event based on this request: "${request}"

**Step 1:** Parse the request to understand:
- Which event to move (by title, time, or other identifier)
- The new date/time for the event

**Step 2:** Use todays_schedule or list_events to find the event being referenced.

**Step 3:** If multiple matching events, ask for clarification. If one match, proceed.

**Step 4:** Check for conflicts at the new time using list_events.

**Step 5:** Use update_event to reschedule with the new start and end times.

**Step 6:** Return:
- Confirmation of the change
- Old time → New time
- Note any conflicts detected at the new time
- The event URL for reference`
          }
        }]
      };
    }

    // Email-Calendar Integration Prompts
    case 'process_scheduling_email': {
      const { emailId } = args;
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Process the email with ID ${emailId} for scheduling content and create a calendar event if appropriate.

**Step 1:** Use get_email to retrieve the full email details.

**Step 2:** Use detect_scheduling_email to analyze if this email contains scheduling intent.

**Step 3:** If scheduling intent detected, extract:
- **What:** Meeting/call/appointment type and purpose
- **When:** Proposed date(s) and time(s)
- **Duration:** How long (default to 1 hour if not specified)
- **Where:** Location, video call link, or phone number
- **Who:** Attendees (usually the email sender)

**Step 4:** If multiple times are proposed, use check_availability to find which slots are free.

**Step 5:** Use list_calendars to get the calendar ID.

**Step 6:** Use create_event to add the event with:
- Summary: Brief description of the meeting
- Description: Include context from the email
- Start/End: In ISO format (e.g., 2026-01-28T10:00:00)
- Location: If provided
- Attendees: Email sender

**Step 7:** Optionally use draft_customer_reply to draft a confirmation email.

**Step 8:** Return:
- Summary of what was scheduled
- Event details (date, time, location)
- Event URL
- Any notes about availability conflicts
- Draft confirmation email if created`
          }
        }]
      };
    }

    case 'scan_for_scheduling_emails': {
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Scan recent customer emails for scheduling requests that may need calendar entries.

**Step 1:** Use list_emails with filters to get recent unread emails:
- Filter by to: sales@novique.ai (always customers)
- Filter by to: support@novique.ai (always customers)
- Also check emails to mark@novique.ai

**Step 2:** For each email found, use detect_scheduling_email to check for scheduling content.

**Step 3:** Compile a report of emails with scheduling intent:

📧 **Emails with Scheduling Content**
For each email found:
- Sender name and email
- Subject line
- Confidence level (HIGH/MEDIUM/LOW)
- Brief preview of scheduling request
- Recommended action

📊 **Summary**
- Total emails scanned
- Emails with scheduling intent
- High priority items needing immediate attention

💡 **Recommendations**
- Which emails should be processed first
- Any time-sensitive requests

**Step 4:** For any HIGH confidence matches, offer to process them using process_scheduling_email.`
          }
        }]
      };
    }

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// Start the server
async function main() {
  console.error('Starting Fastmail MCP Server...');
  console.error('Email:', email);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Fastmail MCP Server running');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
