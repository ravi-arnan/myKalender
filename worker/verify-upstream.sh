#!/usr/bin/env bash
# Send the real schema and a real Indonesian prompt straight to Groq, skipping
# the worker and Firebase, then assert the parts that have actually broken
# before: the model must accept `response_format: json_schema`, and multiple
# reminders must come back as separate entries rather than one concatenated
# number (see README, "Two things that look wrong until you know why").
#
# Usage: GROQ_API_KEY=gsk_xxx ./verify-upstream.sh
set -euo pipefail

: "${GROQ_API_KEY:?set GROQ_API_KEY (console.groq.com) before running}"
MODEL="${MODEL:-openai/gpt-oss-120b}"

# A Wednesday, so "Selasa terdekat" is unambiguous and checkable.
TODAY="2026-07-29"

request=$(MODEL="$MODEL" TODAY="$TODAY" python3 - <<'PY'
import json, os

schema = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "events": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": ["string", "null"]},
                    "startDate": {"type": "string"},
                    "startTime": {"type": "string"},
                    "endTime": {"type": "string"},
                    "allDay": {"type": "boolean"},
                    "recurrence": {
                        "type": "string",
                        "enum": ["none", "daily", "weekdays", "weekly", "monthly"],
                    },
                    "reminderOffsetsMinutes": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": ["0", "5", "10", "20", "30", "60", "1440"],
                        },
                    },
                },
                "required": [
                    "title", "description", "startDate", "startTime",
                    "endTime", "allDay", "recurrence", "reminderOffsetsMinutes",
                ],
            },
        }
    },
    "required": ["events"],
}

system = (
    "Kamu adalah AI scheduling assistant untuk myKalender, aplikasi kalender "
    "personal user Indonesia.\n"
    f"Tanggal hari ini: {os.environ['TODAY']} (Rabu), zona waktu Asia/Makassar "
    "(WITA, UTC+8).\n"
    "Mode: FRESH. Parse deskripsi natural language dari user jadi daftar event "
    "terstruktur.\n\n"
    "Aturan:\n"
    "- Output WAJIB valid JSON sesuai schema. Field tambahan dilarang.\n"
    "- startDate: ISO YYYY-MM-DD di zona waktu user.\n"
    "- startTime/endTime: HH:mm 24-jam. Untuk allDay, set startTime=00:00 endTime=23:59.\n"
    "- Jika user nyebut hari tanpa tanggal (misal 'Senin'), pakai Senin terdekat ke depan.\n"
    "- reminderOffsetsMinutes: menit sebelum mulai, satu entri per pengingat. Default ['20'].\n"
)
user = (
    "kuliah STKI tiap Selasa jam 10 pagi sampai 12 siang di ruang 301, "
    "ingatkan 1 hari dan 1 jam sebelum."
)

print(json.dumps({
    "model": os.environ["MODEL"],
    "messages": [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ],
    "response_format": {
        "type": "json_schema",
        "json_schema": {"name": "schedule_events", "strict": True, "schema": schema},
    },
    "temperature": 0.2,
}))
PY
)

response=$(curl -sS https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$request" --max-time 90)

echo "$response" | python3 -c '
import json, sys

body = json.load(sys.stdin)
if "choices" not in body:
    sys.exit("upstream rejected the request: " + json.dumps(body)[:500])

events = json.loads(body["choices"][0]["message"]["content"])["events"]
print(json.dumps(events, indent=2, ensure_ascii=False))

assert events, "no events parsed"
first = events[0]
assert first["startDate"] == "2026-08-04", (
    "relative date wrong: nearest Selasa after 2026-07-29 is 2026-08-04, got "
    + first["startDate"]
)
offsets = first["reminderOffsetsMinutes"]
assert sorted(offsets, key=int) == ["60", "1440"], (
    "two reminders should stay two entries, got " + repr(offsets)
)
print("\nOK: schema accepted, relative date correct, reminders not concatenated.")
'
