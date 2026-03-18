#!/usr/bin/env node

/**
 * SessionStart hook: inject today's meeting context into Claude Code sessions.
 *
 * When a Claude Code session starts, this hook checks ~/meetings/ for
 * recordings from today and injects a brief summary into the conversation
 * context. This means Claude already knows what meetings happened today
 * without the user having to ask.
 *
 * Hook event: SessionStart
 * Matcher: startup|resume
 */

import { execFileSync } from "child_process";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const meetingsDir = join(homedir(), "meetings");
const memosDir = join(meetingsDir, "memos");
const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

function findTodaysMeetings() {
  const meetings = [];

  // Check meetings directory
  try {
    for (const file of readdirSync(meetingsDir)) {
      if (file.endsWith(".md") && file.startsWith(today)) {
        const content = readFileSync(join(meetingsDir, file), "utf-8");
        const title = extractField(content, "title") || file;
        const duration = extractField(content, "duration") || "";
        meetings.push({ title, duration, type: "meeting", file });
      }
    }
  } catch {
    // No meetings directory — that's fine
  }

  // Check memos directory
  try {
    for (const file of readdirSync(memosDir)) {
      if (file.endsWith(".md") && file.startsWith(today)) {
        const content = readFileSync(join(memosDir, file), "utf-8");
        const title = extractField(content, "title") || file;
        const duration = extractField(content, "duration") || "";
        meetings.push({ title, duration, type: "memo", file });
      }
    }
  } catch {
    // No memos directory — that's fine
  }

  return meetings;
}

function extractField(content, key) {
  const prefix = `${key}:`;
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length).trim().replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

// Run
const meetings = findTodaysMeetings();

if (meetings.length > 0) {
  const meetingCount = meetings.filter((m) => m.type === "meeting").length;
  const memoCount = meetings.filter((m) => m.type === "memo").length;

  let summary = `Today's recordings: `;
  const parts = [];
  if (meetingCount > 0)
    parts.push(`${meetingCount} meeting${meetingCount > 1 ? "s" : ""}`);
  if (memoCount > 0)
    parts.push(`${memoCount} voice memo${memoCount > 1 ? "s" : ""}`);
  summary += parts.join(", ") + ".\n";

  for (const m of meetings) {
    summary += `- ${m.title} [${m.type}]${m.duration ? ` (${m.duration})` : ""}\n`;
  }

  summary +=
    '\nUse `/minutes search` to find details, or `/minutes recap` for a full digest.';

  // Output as hook result
  const result = JSON.stringify({ additionalContext: summary });
  process.stdout.write(result);
}
