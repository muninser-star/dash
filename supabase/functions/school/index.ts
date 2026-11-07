import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { addDays, dayClosure, eventInput, normalizeTime, occurs, validDate, validTime } from "../../../school/schedule.mjs";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const headers = {
  "Access-Control-Allow-Origin": "https://dash.opalinskiy.ru",
  "Access-Control-Allow-Headers": "content-type, apikey, x-mk-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};
const respond = (body: object, status = 200) => Response.json(body, { status, headers });
const ok = (data = {}) => respond({ status: "ok", ...data });
const fail = (code: string, status = 400) => respond({ status: "error", code }, status);
const isUuid = (value: unknown) => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), n => n.toString(16).padStart(2, "0")).join("");
async function importId(value: unknown) {
  const h = await hash(JSON.stringify(value));
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20, 32)].join("-");
}

async function access(code: string | null) {
  if (!code || code.length < 20 || code.length > 200) return false;
  const { data, error } = await db.from("access_codes").select("owner,hidden_people")
    .eq("code_hash", await hash(code)).is("revoked_at", null).in("owner", ["denis", "anya"]).limit(1).maybeSingle();
  if (error) throw error;
  return !!data && !(data.hidden_people || []).some((person: string) => ["dima", "danya"].includes(person));
}

const normalize = <T extends { start_time: string; end_time: string }>(row: T) => ({
  ...row, start_time: normalizeTime(row.start_time), end_time: normalizeTime(row.end_time),
});
function bellInput(row: { lesson: number; start_time: string; end_time: string }) {
  if (!row || !Number.isInteger(row.lesson) || row.lesson < 1 || row.lesson > 12
    || !validTime(row.start_time) || !validTime(row.end_time) || row.start_time >= row.end_time) throw Error("invalid_bells");
  return { lesson: row.lesson, start_time: row.start_time, end_time: row.end_time };
}

async function list(from: string, to: string) {
  if (!validDate(from) || !validDate(to) || to < from || to > addDays(from, 30)) return fail("invalid_range");
  const [eventResult, skipResult, bellResult, closureResult] = await Promise.all([
    db.from("dash_school_events").select("*").lte("date", to).or("until.is.null,until.gte." + from)
      .or("weekdays.neq.{},date.gte." + from).order("start_time").order("id"),
    db.from("dash_school_skips").select("event_id,date").gte("date", from).lte("date", to),
    db.from("dash_school_bells").select("*").order("lesson"),
    db.from("dash_school_closures").select("date_from,date_to,kind,label").lte("date_from", to).gte("date_to", from).order("date_from"),
  ]);
  if (eventResult.error || skipResult.error || bellResult.error || closureResult.error) throw Error("database_read");
  const rows = eventResult.data.map(normalize);
  const skipped = new Set(skipResult.data.map(row => row.event_id + "/" + row.date));
  const events = [];
  const closures = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const closed = dayClosure(date, closureResult.data);
    if (closed) closures.push(closed);
    for (const row of rows) {
      if (!occurs(row, date) || skipped.has(row.id + "/" + date)) continue;
      if (closed && row.category === "school") continue;
      events.push({
        ...row, occurrence: date,
        start: date + "T" + row.start_time + ":00+03:00",
        end: date + "T" + row.end_time + ":00+03:00",
      });
    }
  }
  return ok({ events, bells: bellResult.data.map(normalize), closures });
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return fail("method", 405);
  try {
    const code = req.headers.get("x-mk-key");
    if (!await access(code)) return fail("forbidden", 403);
    const raw = await req.text();
    if (raw.length > 100_000) return fail("too_large", 413);
    let b;
    try { b = JSON.parse(raw); } catch { return fail("bad_request"); }
    if (!b || typeof b !== "object") return fail("bad_request");
    if (b.action === "list") return await list(b.from, b.to);
    if (code === Deno.env.get("FAMILY_BOT_SOURCE_KEY")) return fail("forbidden", 403);
    if (b.action === "create") {
      if (!isUuid(b.id)) return fail("invalid_event");
      const result = await db.from("dash_school_events").upsert({ id: b.id, ...eventInput(b.event) }, { onConflict: "id", ignoreDuplicates: true });
      if (result.error) throw result.error;
      return ok();
    }
    if (b.action === "import") {
      if (!Array.isArray(b.events) || b.events.length < 1 || b.events.length > 40) return fail("invalid_event");
      const rows = await Promise.all(b.events.map(async (value: unknown) => {
        const event = eventInput(value);
        return { id: await importId(event), ...event };
      }));
      const result = await db.from("dash_school_events").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
      if (result.error) throw result.error;
      return ok();
    }
    if (b.action === "bells") {
      if (!Array.isArray(b.bells) || b.bells.length < 1 || b.bells.length > 12) return fail("invalid_bells");
      const bells = b.bells.map(bellInput);
      if (new Set(bells.map((row: { lesson: number }) => row.lesson)).size !== bells.length) return fail("invalid_bells");
      const result = await db.from("dash_school_bells").upsert(bells, { onConflict: "lesson" });
      if (result.error) throw result.error;
      return ok();
    }
    if (!["update", "delete", "skip"].includes(b.action) || !isUuid(b.id) || !isUuid(b.revision)) return fail("bad_request");
    if (b.action === "skip") {
      const { data, error } = await db.from("dash_school_events").select("date,weekdays,until")
        .eq("id", b.id).eq("revision", b.revision).maybeSingle();
      if (error) throw error;
      if (!data) return fail("conflict", 409);
      if (!validDate(b.date) || !data.weekdays.length || !occurs(data, b.date)) return fail("invalid_event");
      const result = await db.from("dash_school_skips").upsert({ event_id: b.id, date: b.date }, { onConflict: "event_id,date", ignoreDuplicates: true });
      if (result.error?.code === "23503") return fail("conflict", 409);
      if (result.error) throw result.error;
      return ok();
    }
    const table = db.from("dash_school_events");
    const operation = b.action === "delete" ? table.delete() : table.update({ ...eventInput(b.event), revision: crypto.randomUUID() });
    const { data, error } = await operation.eq("id", b.id).eq("revision", b.revision).select("id");
    if (error) throw error;
    return data.length ? ok() : fail("conflict", 409);
  } catch (error) {
    if (error instanceof Error && ["invalid_event", "invalid_bells"].includes(error.message)) return fail(error.message);
    console.error("school_request_failed", (error as { code?: string })?.code || "internal");
    return fail("server_error", 500);
  }
});
