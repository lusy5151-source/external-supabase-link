## Goal

Surface the silent failure in hiking journal creation by adding (1) a pre-submit debug log of the exact payload + auth state, (2) full error capture around the Supabase insert, and (3) on-screen feedback (toast + alert) showing the actual error message and code.

## Files to change

1. `src/components/JournalForm.tsx` — `handleSubmit`
2. `src/hooks/useHikingJournals.ts` — `createJournal`

## Change 1 — `src/components/JournalForm.tsx` (`handleSubmit`)

Replace the current submit body with a version that:

- Coerces `mountain_id` to `Number(...)` defensively.
- Logs the payload + the **actual auth user id** (from `supabase.auth.getUser()`) right before submit:
  ```ts
  console.log("Submitting journal:", {
    user_id: authUser?.id,
    user_id_from_context: user?.id,
    mountain_id: journalData.mountain_id,
    mountain_id_type: typeof journalData.mountain_id,
    hiked_at: journalData.hiked_at,
    visibility: journalData.visibility,
    photos_count: photos.length,
    tagged_friends_count: taggedFriends.length,
    isEdit,
  });
  ```
- Wraps the create/update call in a `try/catch`.
- On error, logs `JSON.stringify(error)`, shows a destructive toast with `error.message` + `error.code`, and additionally raises a visible `alert(...)` so the failure is visible without devtools (per request).
- On unexpected exception, logs and shows the exception message via toast + alert.
- Always resets `setSaving(false)` in `finally`.

This addresses the user's items 1–3 (try/catch, log, visible alert/toast) at the form layer.

## Change 2 — `src/hooks/useHikingJournals.ts` (`createJournal`)

Augment the existing insert path so the hook **returns the raw Supabase error** (it already does) but also logs the full payload before insert and the stringified error after. Specifically:

- Before the `.insert(...)` call, add:
  ```ts
  console.log("createJournal payload:", {
    user_id: user.id,
    mountain_id: (journal as any).mountain_id,
    mountain_id_type: typeof (journal as any).mountain_id,
    hiked_at: (journal as any).hiked_at,
    visibility: (journal as any).visibility,
  });
  ```
- Replace `console.error("Failed to create journal:", error);` with:
  ```ts
  console.error("Journal insert error:", JSON.stringify(error));
  ```
- Keep the existing `sonner` toast call as a backup; the JournalForm toast/alert remains the primary user feedback.

## Why it's enough

- The two log points (form + hook) confirm whether the issue is in payload shape (`mountain_id` typing, missing fields), auth state (no `user_id`), or RLS (`new row violates row-level security policy`).
- The `alert(...)` guarantees the message reaches the user even if toast is suppressed by the modal stacking, so we can read the exact `message` + `code` on-device.

## Out of scope

- No schema changes, no RLS changes, no UI redesign. Pure observability/feedback.

## Acceptance check

After approval and edits, reproducing the failure should produce:
- A `Submitting journal:` console line with concrete values.
- Either a `Journal insert error: {...}` console line **and** an on-screen alert/toast with the Supabase error `message` + `code`, or a successful save.
