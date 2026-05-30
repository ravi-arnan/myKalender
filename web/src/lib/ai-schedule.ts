// Client for natural-language schedule parsing.
// The GitHub Models PAT is NOT in the client bundle: requests go through a
// Cloudflare Worker proxy (see /worker) that holds the PAT server-side and
// verifies the caller's Firebase ID token. VITE_AI_PROXY_URL is the worker URL
// (public, not a secret).

import { auth } from "./firebase";

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
  reminderOffsetsMinutes: number[]; // each 0/5/10/20/30/60/1440
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
          description: { type: ["string", "null"] },
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
          reminderOffsetsMinutes: {
            type: "array",
            items: { type: "integer" },
            description:
              "One or more reminders, minutes before start (each: 0, 5, 10, 20, 30, 60, or 1440). Usually one; use multiple only when the user asks for several alerts.",
          },
        },
        required: [
          "title",
          "description",
          "startDate",
          "startTime",
          "endTime",
          "allDay",
          "recurrence",
          "reminderOffsetsMinutes",
        ],
      },
    },
  },
  required: ["events"],
} as const;

function getProxyUrl(): string {
  const url = import.meta.env.VITE_AI_PROXY_URL as string | undefined;
  if (!url) {
    throw new Error(
      "VITE_AI_PROXY_URL belum di-set. Deploy worker AI (lihat /worker) lalu tambahkan URL-nya di web/.env.local.",
    );
  }
  return url;
}

async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Harus sign-in dulu untuk pakai AI Jadwal");
  return user.getIdToken();
}

function buildSystemPrompt(today: Date, current?: AiParsedEvent[]): string {
  // Use Asia/Makassar local date, not UTC. Near midnight UTC, the UTC date
  // is the day before in WITA, which makes "Senin terdekat" off by a day.
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(today);
  const dayName = today.toLocaleDateString("id-ID", {
    weekday: "long",
    timeZone: TIMEZONE,
  });
  const lines = [
    "Kamu adalah AI scheduling assistant untuk myKalender, aplikasi kalender personal user Indonesia.",
    `Tanggal hari ini: ${iso} (${dayName}), zona waktu ${TIMEZONE} (WITA, UTC+8).`,
    current && current.length > 0
      ? "Mode: REFINE. User sudah punya event dalam preview (lihat di bawah). Mereka kasih instruksi tambahan. Update daftar event sesuai instruksi (tambah, ubah, atau hapus), lalu return DAFTAR LENGKAP hasil akhirnya. Jangan return cuma diff."
      : "Mode: FRESH. Parse deskripsi natural language dari user jadi daftar event terstruktur.",
    "",
    "Aturan:",
    "- Output WAJIB valid JSON sesuai schema. Field tambahan dilarang.",
    "- startDate: ISO YYYY-MM-DD di zona waktu user.",
    "- startTime/endTime: HH:mm 24-jam. Untuk allDay, set startTime=00:00 endTime=23:59.",
    "- Recurrence presets: 'none', 'daily', 'weekdays' (Sen-Jum), 'weekly' (tiap minggu di hari yang sama), 'monthly'.",
    "  Untuk pola yang gak match preset (misal 'Selasa dan Kamis'), buat 1 event terpisah per hari pertama dengan recurrence='weekly'.",
    "- Jika user nyebut hari tanpa tanggal (misal 'Senin'), pakai Senin terdekat ke depan.",
    "- Jika tahun gak disebut, asumsikan tahun saat ini.",
    "- reminderOffsetsMinutes: array menit sebelum mulai. Default [20]. Kalau user minta beberapa pengingat ('ingatkan 1 hari dan 1 jam sebelum'), isi beberapa, mis. [1440, 60].",
    "  Nilai valid per item: 0, 5, 10, 20, 30, 60, 1440 (=1 hari). Pakai yang paling mendekati.",
    "- Title harus ringkas dan deskriptif (kapitalisasi normal, bukan ALL CAPS).",
    "- Description opsional, isi context tambahan dari prompt (lokasi, dosen, dll) kalau ada.",
    "- Kalau prompt ambigu atau gak ada event yang bisa di-extract, kembalikan events: [].",
  ];
  if (current && current.length > 0) {
    lines.push(
      "",
      "Event saat ini di preview (JSON):",
      JSON.stringify(current, null, 2),
    );
  }
  return lines.join("\n");
}

export async function parseSchedulePrompt(
  prompt: string,
  currentEvents?: AiParsedEvent[],
): Promise<AiParsedEvent[]> {
  const proxyUrl = getProxyUrl();
  const idToken = await getIdToken();
  const today = new Date();
  const body = {
    model: MODEL,
    messages: [
      { role: "system" as const, content: buildSystemPrompt(today, currentEvents) },
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

  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `AI proxy error ${response.status}: ${text || response.statusText}`,
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
  const rawArr = Array.isArray(e.reminderOffsetsMinutes)
    ? e.reminderOffsetsMinutes
    : [];
  const snapped = rawArr
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n))
    .map((n) => (VALID_OFFSETS.includes(n) ? n : closest(n, VALID_OFFSETS)));
  const offsets = snapped.length
    ? [...new Set(snapped)].sort((a, b) => a - b)
    : [20];
  return {
    ...e,
    reminderOffsetsMinutes: offsets,
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
