
# Asana API – Minimal Playbook for Task Creation (Phase 1)

> **Purpose**: Enable our server tool (`createTask`) to create **one** task in Asana with
> `name`, `notes`, `assignee`, `due_on`, and `projects`, then return the task **permalink**.
> This doc is scoped to what the agent needs right now.

---

## Base Info

- **Base URL**: `https://app.asana.com/api/1.0`  :contentReference[oaicite:0]{index=0}  
- **Auth**: Bearer token (Personal Access Token, PAT) via `Authorization: Bearer <token>` header.  :contentReference[oaicite:1]{index=1}  
- **Primary endpoint (create)**: `POST /tasks` (JSON body inside top-level `"data"`).  :contentReference[oaicite:2]{index=2}

> **PAT storage**: Use `ASANA_ACCESS_TOKEN` in server env (`.env.local`). Never expose to the browser.

---

## Fields we care about (tasks)

- **`name`** *(string)* – short, action-oriented title.  :contentReference[oaicite:3]{index=3}
- **`notes`** *(string)* – free-form description (we’ll synthesize from the user’s ramble plus project context).  :contentReference[oaicite:4]{index=4}
- **`projects`** *(array of project GIDs)* – at creation, associates the task to project(s).  :contentReference[oaicite:5]{index=5}
- **`assignee`** – the user to assign to. **Officially a user GID or the string `"me"`**. (We can resolve emails to GIDs; see below.)  :contentReference[oaicite:6]{index=6}
- **`due_on`** *(date `YYYY-MM-DD`)* – **localized date**, no time component; **do not** send with `due_at`.  :contentReference[oaicite:7]{index=7}
- **`due_at`** *(ISO-8601 UTC datetime)* – only if we need a time (we don’t in Phase 1).  :contentReference[oaicite:8]{index=8}

> **Sections (future)**: to put a task directly into a section during creation, use `memberships: [{ project: <gid>, section: <gid> }]`. We’re deferring this to Phase 2.  :contentReference[oaicite:9]{index=9}

---

## Timezones & Dates (America/New_York)

- **`due_on` is a *date* in the user’s local timezone** (no time). You send `"YYYY-MM-DD"` and Asana treats it as a localized due date.  :contentReference[oaicite:10]{index=10}  
- If you ever need a timestamp, **`due_at`** is **UTC ISO-8601**; Asana stores/returns UTC and the UI shows it in the user’s local time.  :contentReference[oaicite:11]{index=11}

**Implementation tip (server):**
When the user says “next Friday”, normalize it to **America/New_York** before formatting:

```

(next Friday in America/New\_York) -> format('YYYY-MM-DD') -> send as due\_on

````

This ensures the *date* is correct for Eastern even if the server runs in UTC.

---

## Assigning by Email vs GID

- Asana’s API **documents** `assignee` as a **user GID** (or `"me"`).  :contentReference[oaicite:12]{index=12}
- You **can** resolve a user GID from an email using `GET /users/{email}` (works in most org setups), or via **Typeahead** in a workspace.  :contentReference[oaicite:13]{index=13}
- Some third-party connectors accept “email or user id” and map to a GID for you, but that’s **their** abstraction—not guaranteed by the raw API.  :contentReference[oaicite:14]{index=14}

> **Phase 1 decision**: We prefer to **pass a GID** for reliability. If we only have an email, we’ll resolve it server-side:
> 1) `GET /users/{email}` (fallback: workspace users listing or typeahead),  
> 2) read `gid`,  
> 3) use `assignee: "<gid>"` in the create call.  :contentReference[oaicite:15]{index=15}

---

## Return the Permalink

After creation, fetch `permalink_url` by adding `?opt_fields=permalink_url,assignee.name,assignee.email` to the **GET task** call, or request fields in the create response if supported by the client helper.  :contentReference[oaicite:16]{index=16}

---

## Request Examples

### cURL (create a task)
```bash
curl -X POST "https://app.asana.com/api/1.0/tasks" \
  -H "Authorization: Bearer $ASANA_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "Email leadership for monthly accounting spreadsheets",
      "notes": "CC finance ops.\nInclude due date in body.\nLinks: ...",
      "assignee": "12001234567890",                 // user GID or "me"
      "due_on": "2025-09-26",                       // YYYY-MM-DD (local date)
      "projects": ["12009999888877"]                // project GID(s)
    }
  }'
````

> On success, you’ll get a task payload (compact or full depending on fields). Then `GET /tasks/{task_gid}?opt_fields=permalink_url` to display the link.  ([Asana Developers][1])

### TypeScript (Node/Edge fetch in our tool)

```ts
const res = await fetch("https://app.asana.com/api/1.0/tasks", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.ASANA_ACCESS_TOKEN!}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    data: {
      name,
      notes,
      assignee,            // GID or "me"
      due_on,              // "YYYY-MM-DD"
      projects: [projectId]
    }
  })
});

if (!res.ok) {
  // 429 handling below
  throw new Error(`Asana error ${res.status}: ${await res.text()}`);
}

const json = await res.json();
const taskGid = json?.data?.gid as string;

// Fetch permalink
const linkRes = await fetch(
  `https://app.asana.com/api/1.0/tasks/${taskGid}?opt_fields=permalink_url,assignee.name,assignee.email`,
  { headers: { Authorization: `Bearer ${process.env.ASANA_ACCESS_TOKEN!}` } }
);
const linkJson = await linkRes.json();
const permalink = linkJson?.data?.permalink_url as string;
```

---

## Rate Limits & Retries

* **Per-minute windows**: **Free: 150/min**, **Paid: 1500/min** (per token). Exceeding returns **HTTP 429** with a **`Retry-After` (seconds)** header.  ([Asana Developers][2])
* **Guideline**: back off using the `Retry-After` value, then retry. (The official client libs implement backoff; we can mimic it.)  ([Asana Developers][2])

Example (server):

```ts
if (res.status === 429) {
  const retryAfter = Number(res.headers.get("Retry-After") ?? "1");
  await new Promise(r => setTimeout(r, (retryAfter + 0.5) * 1000));
  // retry once or twice
}
```

---

## Pagination (FYI)

We don’t page for creation, but if we list users/projects to resolve emails/aliases, use **`limit`** + follow **`next_page`** cursors.  ([Asana Developers][3])

---

## Testing

* **Auth check**: `GET /users/me` with your PAT to verify the token.  ([Asana Developers][4])
* **Create test**: POST `/tasks` with a sandbox project + `assignee: "me"`.
* **Permalink**: `GET /tasks/{gid}?opt_fields=permalink_url`.

---

## Common Errors

* **400**: invalid body shape (ensure JSON `{ "data": { ... } }`), or mutually exclusive `due_on` vs `due_at`.  ([Asana Developers][5])
* **401**: bad or missing PAT.  ([Asana Developers][6])
* **404**: bad project GID or user not visible to the token’s user.  ([Asana Developers][1])
* **429**: rate limit—read `Retry-After`, back off, and retry.  ([Asana Developers][2])

---

## Optional (later phases)

* **Sections at creation** via `memberships` (project + section).  ([Asana Developers][7])
* **Add to section after creation**: `POST /sections/{section_gid}/addTask`.  ([Asana Forum][8])
* **Task templates**: `POST /task_templates/{template_gid}/instantiateTask`.  ([Asana Forum][9])

---

## References

* **Tasks reference** (fields: `due_on`, `due_at`, `projects`, `memberships`, etc.).  ([Asana Developers][7])
* **Create a task** (POST `/tasks`).  ([Asana Developers][5])
* **PAT & Auth**.  ([Asana Developers][6])
* **Rate Limits**.  ([Asana Developers][2])
* **Pagination**.  ([Asana Developers][3])
* **Users / resolving emails** (`/users/{email}`, Typeahead).  ([Asana Forum][10])
