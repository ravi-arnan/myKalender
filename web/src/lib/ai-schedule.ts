// GitHub Models client for natural-language schedule parsing.
// Token is exposed to the client bundle via VITE_GITHUB_MODELS_TOKEN.
// Risk note: this is a single-user app; for multi-tenant deployments the call
// should be proxied through a serverless function so the PAT stays server-side.

const ENDPOINT = "https://models.github.ai/inference/chat/completions";
const MODEL = "openai/gpt-4o-mini";
const TIMEZONE = "Asia/Makassar";

export type AiRecurrence = "none" | "daily" | "weekdays" | "weekly" | "monthly";

export interface AiParsedEvent {
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h), "00:00" when allDay
  endTime: string;   // HH:mm (24h), "23:59" when allDay
  allDay: boolean;
  recurrence: AiRecurrence;
  reminderOffsetMinutes: number; // 0/5/10/20/30/60/1440
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

const EVENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          startDate: {
            type: "string",
            description: "ISO date YYYY-MM-DD in the user's local timezone",
          },
          startTime: { type: "string", description: "HH:mm 24h, 00:00 when allDay" },
          endTime: { type: "string", description: "HH:mm 24h, 23:59 when allDay" },
          allDay: { type: "boolean" },
          recurrence: {
            type: "string",
            enum: ["none", "daily", "weekdays", "weekly", "monthly"],
          },
          reminderOffsetMinutes: {
            type: "integer",
            description: "Minutes before event start (0, 5, 10, 20, 30, 60, or 1440)",
          },
        },
        required: [
          "title",
          "startDate",
          "startTime",
          "endTime",
          "allDay",
          "recurrence",
          "reminderOffsetMinutes",
        ],
      },
    },
  },
  required: ["events"],
} as const;

function getToken(): string {
  const token = import.meta.env.VITE_GITHUB_MODELS_TOKEN as string | undefined;
  if (!token) {
    throw new Error(
      "VITE_GITHUB_MODELS_TOKEN belum di-set. Tambahkan di web/.env.local lalu restart dev server.",
    );
  }
  return token;
}

function buildSystemPrompt(today: Date): string {
  // Use Asia/Makassar local date, not UTC. Near midnight UTC, the UTC date
  // is the day before in WITA, which makes "Senin terdekat" off by a day.
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(today);
  const dayName = today.toLocaleDateString("id-ID", {
    weekday: "long",
    timeZone: TIMEZONE,
  });
  return [
    "Kamu adalah AI scheduling assistant untuk myKalender, aplikasi kalender personal user Indonesia.",
    `Tanggal hari ini: ${iso} (${dayName}), zona waktu ${TIMEZONE} (WITA, UTC+8).`,
    "Tugas: parse deskripsi natural language dari user jadi daftar event terstruktur.",
    "",
    "Aturan:",
    "- Output WAJIB valid JSON sesuai schema. Field tambahan dilarang.",
    "- startDate: ISO YYYY-MM-DD di zona waktu user.",
    "- startTime/endTime: HH:mm 24-jam. Untuk allDay, set startTime=00:00 endTime=23:59.",
    "- Recurrence presets: 'none', 'daily', 'weekdays' (Sen-Jum), 'weekly' (tiap minggu di hari yang sama), 'monthly'.",
    "  Untuk pola yang gak match preset (misal 'Selasa dan Kamis'), buat 1 event terpisah per hari pertama dengan recurrence='weekly'.",
    "- Jika user nyebut hari tanpa tanggal (misal 'Senin'), pakai Senin terdekat ke depan.",
    "- Jika tahun gak disebut, asumsikan tahun saat ini.",
    "- reminderOffsetMinutes default 20 menit. Kalau user nyebut spesifik ('1 jam sebelum'), konvert.",
    "  Nilai valid: 0, 5, 10, 20, 30, 60, 1440 (=1 hari). Pakai yang paling mendekati.",
    "- Title harus ringkas dan deskriptif (kapitalisasi normal, bukan ALL CAPS).",
    "- Description opsional, isi context tambahan dari prompt (lokasi, dosen, dll) kalau ada.",
    "- Kalau prompt ambigu atau gak ada event yang bisa di-extract, kembalikan events: [].",
  ].join("\n");
}

export async function parseSchedulePrompt(
  prompt: string,
): Promise<AiParsedEvent[]> {
  const token = getToken();
  const today = new Date();
  const body = {
    model: MODEL,
    messages: [
      { role: "system" as const, content: buildSystemPrompt(today) },
      { role: "user" as const, content: prompt },
    ] satisfies ChatMessage[],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "schedule_events",
        strict: true,
        schema: EVENT_SCHEMA,
      },
    },
    temperature: 0.2,
  };

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `GitHub Models error ${response.status}: ${text || response.statusText}`,
    );
  }

  const json = (await response.json()) as ChatResponse;
  if (json.error?.message) throw new Error(json.error.message);

  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Respons AI kosong");

  let parsed: { events?: AiParsedEvent[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI mengembalikan JSON tidak valid");
  }

  const events = parsed.events ?? [];
  return events.map(normalizeEvent);
}

const VALID_OFFSETS = [0, 5, 10, 20, 30, 60, 1440];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function normalizeEvent(e: AiParsedEvent): AiParsedEvent {
  if (!DATE_RE.test(e.startDate)) {
    throw new Error(`AI mengembalikan tanggal tidak valid: ${e.startDate}`);
  }
  if (!TIME_RE.test(e.startTime) || !TIME_RE.test(e.endTime)) {
    throw new Error(`AI mengembalikan waktu tidak valid: ${e.startTime}-${e.endTime}`);
  }
  const rawOffset = Number(e.reminderOffsetMinutes);
  const offset = Number.isFinite(rawOffset)
    ? VALID_OFFSETS.includes(rawOffset)
      ? rawOffset
      : closest(rawOffset, VALID_OFFSETS)
    : 20;
  return {
    ...e,
    reminderOffsetMinutes: offset,
    allDay: Boolean(e.allDay),
    description: e.description?.trim() || undefined,
  };
}

function closest(value: number, options: number[]): number {
  return options.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev,
  );
}

export function aiEventToDates(e: AiParsedEvent): { start: Date; end: Date } {
  const [sh, sm] = e.startTime.split(":").map(Number);
  const [eh, em] = e.endTime.split(":").map(Number);
  const [y, mo, d] = e.startDate.split("-").map(Number);
  const start = new Date(y, mo - 1, d, sh, sm, 0, 0);
  let end = new Date(y, mo - 1, d, eh, em, 0, 0);
  // If LLM hands back overnight (e.g. 22:00-02:00), bump end to next day.
  if (end.getTime() <= start.getTime()) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }
  return { start, end };
}
