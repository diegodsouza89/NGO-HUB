# Connecting the support desk — about five minutes

Until this is done, the contact form tells visitors it could not send their
request. That is deliberate: the old code silently threw every request away
while showing the person a reference number, and an honest error is better than
a fake receipt.

Nothing here costs anything. Cloudflare D1's free allowance is 5 GB of storage,
5 million row reads a day and 100,000 row writes a day, with no card required.
One ticket is one row written. There is no payment method attached, so if you
ever reached a limit it would return errors rather than charge you.

---

## 1. Create the database

1. Open <https://dash.cloudflare.com> → **Storage & Databases** → **D1 SQL
   database**
2. **Create Database**
3. Name it `ngo-hub` and select **Create**

## 2. Create the table

1. Still on that database, select **Console**
2. Paste the whole of `TICKETS-SCHEMA.sql` from this repository
3. **Execute**
4. Select **Tables** — you should now see a `tickets` table with no rows

## 3. Bind it to the website

1. **Workers & Pages** → your **ngo-hub** Pages project → **Settings** →
   **Bindings** → **Add** → **D1 database**
2. **Variable name**: `DB` — this exact name, in capitals; the code looks for it
3. **D1 database**: choose `ngo-hub`
4. Save

## 4. Set the key that lets you read tickets

Tickets hold visitors' names, email addresses and phone numbers. `/staff` is a
screen in a JavaScript file that everyone downloads, so a password checked in
the browser would not protect them — anyone could call the API directly. Reading
tickets therefore needs a key that is checked on the server.

1. Same **Settings** page → **Variables and Secrets** → **Add**
2. **Variable name**: `TICKETS_ADMIN_KEY`
3. **Value**: a long random string. Twenty or more characters, nothing
   guessable, and not a password you use elsewhere.
4. Choose **Secret** so the value stays hidden after saving
5. Save, then **Deployments** → **Retry deployment** on the latest build, so the
   new bindings take effect

Keep a copy of that key somewhere you can find it — a password manager. You will
type it into the portal once per browser, and it is not recoverable from
Cloudflare once saved as a secret.

---

## 5. Check it works

1. Open <https://ngo-hub.pages.dev>, use the contact form, and send yourself a
   test request. You should get a reference like `NGO-482913`.
2. Go to `/staff` → **Tickets**. It will ask for the admin key — paste the value
   from step 4 and select **Unlock inbox**.
3. Your test request should be listed, with the sender's email as a clickable
   link. Mark it **Resolved**, reload the page, and confirm it stayed resolved.

That last check is the one that matters: it proves the status is stored on the
server rather than in your browser.

---

## If something goes wrong

Press **F12 → Network**, select the `tickets` request and read the `detail`
field.

| What it says | What to do |
| --- | --- |
| `No D1 binding named DB` | Step 3 — the variable name must be exactly `DB` |
| `no such table: tickets` | Step 2 — the schema was not run against this database |
| `Ticket reading is not configured` | Step 4 — `TICKETS_ADMIN_KEY` is not set |
| `That admin key is not correct` | The value you typed does not match step 4. If you have lost it, set a new one in Cloudflare and re-enter it. |
| `404` on `/api/tickets` | `functions/api/tickets.js` is missing from the repository |
| Nothing changes after setting the bindings | Redeploy — bindings only apply to new deployments |

## What is stored, and what is not

Each row holds the name, email, phone, subject, category and message the visitor
typed, plus the time and a status.

It also holds a SHA-256 hash of the sender's IP address, never the address
itself. That is only used to count how many requests have come from one source
in the past hour, so a single person or script cannot fill the table. The limit
is five an hour; a sixth gets a polite "please wait" rather than being silently
dropped.

## Worth doing next

Set **Support Email** in the portal's Site Settings. When the support desk is
unreachable — a bad deploy, an outage — the contact form shows that address so
the person has another way through. It is empty at the moment, so the error
currently tells them to try again later and nothing more.
