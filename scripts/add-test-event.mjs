import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import admin from "firebase-admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.resolve(
  __dirname,
  "../.archive/mykalender-cad8f-firebase-adminsdk-fbsvc-0524b08059.json",
);
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const UID = "XJiLWO7lVeZvxSATWgGrEzURbB63";

const args = process.argv.slice(2);
const minutesAhead = Number(args[0] ?? 3);
const title = args[1] ?? "Tes Alarm";
const reminderOffsetMinutes = Number(args[2] ?? 0);

const start = new Date(Date.now() + minutesAhead * 60_000);
const end = new Date(start.getTime() + 60 * 60_000);

const doc = {
  title,
  start: admin.firestore.Timestamp.fromDate(start),
  end: admin.firestore.Timestamp.fromDate(end),
  allDay: false,
  reminderOffsetMinutes,
  source: "manual",
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
};

const ref = await admin
  .firestore()
  .collection("users")
  .doc(UID)
  .collection("events")
  .add(doc);

console.log("Test event ditambahkan:");
console.log("  id:    ", ref.id);
console.log("  title: ", title);
console.log("  start: ", start.toLocaleString("id-ID"));
console.log("  reminder offset: ", reminderOffsetMinutes, "menit");
console.log("\nAlarm di HP harusnya bunyi sekitar:",
  new Date(start.getTime() - reminderOffsetMinutes * 60_000).toLocaleString("id-ID"));

process.exit(0);
