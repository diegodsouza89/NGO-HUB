# What `/staff` protects, and what it does not

## The short version

The admin portal at `https://ngo-hub.pages.dev/staff` is a screen inside a
JavaScript file that every visitor to the site downloads. The password check
happens in the visitor's own browser.

That means a person who opens their browser's developer tools can set the
"logged in" flag by hand and see the admin screens without knowing any password.
No amount of client-side code can prevent this. If you want a real lock, use
Cloudflare Access — see the last section.

What the password *does* do is stop a casual visitor who wanders to `/staff`
from clicking around and changing your content. That is worth having. Just don't
mistake it for a security boundary.

## What was wrong, and what changed

**A permanent back door.** `AdminLogin.tsx` used to read:

```js
if (password === savedPasswordHash || password === 'changeme123') {
```

The second test meant `changeme123` always worked, no matter what password you
had set in Settings. Changing your password did not close it. That line is gone.
`changeme123` now only works while it genuinely is the configured password.

**Passwords were stored as plain text.** The setting is called
`adminPasswordHash`, but Settings wrote the password into it unchanged. Now it
holds a PBKDF2-SHA-256 hash with a random salt (210,000 iterations), so the
readable password is no longer sitting in browser storage. Existing installs are
upgraded automatically the next time you log in — nothing to re-enter.

**Settings could not be saved at all.** Support Email and Helpline Phone were
marked as required fields but shipped empty. Browsers block a form's submit
event when a required field is empty, silently — so clicking **Save All
Settings** appeared to do nothing, and a password change never took effect. Both
fields are now optional. If any other constraint ever blocks the form, it now
tells you instead of failing quietly.

**Guessing is now slowed down.** Five attempts are free, then the form locks for
a minute, doubling with each further failure up to fifteen minutes. The lock
survives a page reload. This inconveniences a person at a keyboard; it does not
stop a script, because the check is in the browser.

**The login page no longer prints the default password on screen.**

## Do this now

1. Log in at `/staff`.
2. Go to **Site Settings**. If you see an amber warning that the portal is still
   using the password it shipped with, set a new one and click **Save All
   Settings**.
3. Confirm it took: log out, and check that `changeme123` is refused.

## Making `/staff` a real boundary

Cloudflare Access sits in front of the URL and checks who you are *before* the
page is served. Nothing reaches the browser until you have proved your identity,
which is exactly what the client-side check cannot do. It requires no code
changes.

Cloudflare offers a free Zero Trust tier with a seat allowance — check the
current limit on Cloudflare's Zero Trust pricing page, as it changes.

Rough shape of the setup:

1. In the Cloudflare dashboard, open **Zero Trust**.
2. Go to **Access → Applications → Add an application → Self-hosted**.
3. Set the application path to your admin route, for example
   `ngo-hub.pages.dev/staff`.
4. Add a policy: **Allow**, with a rule that matches the specific email
   addresses of your staff.
5. For the login method, **One-time PIN** needs no identity provider — Cloudflare
   emails a code to the address, and only the listed addresses are accepted.

After that, opening `/staff` asks for an email code first. The password screen
still appears afterwards, which is fine: it becomes a second, weaker layer
rather than the only one.

Note that this protects the `/staff` *page*. It does not hide the article
content, which is public by design.

## Still open

- **Member login on the public site accepts any password.** `loginUser(email)`
  in `lib/storage.ts` looks up the account and signs in without checking a
  password at all. Anyone who knows a member's email address can open their
  dashboard. Nothing here changes that.
- **Everything is per-browser.** Admin edits, bookmarks, analytics and support
  tickets live in whichever browser they were made in. There is no shared
  database yet, which is also why a support ticket submitted by a visitor never
  reaches your inbox.
