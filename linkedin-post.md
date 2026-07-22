# LinkedIn post — use-server-table launch (in Kostas's voice)

## The post

I've built a lot of admin dashboards in my career, and almost every one of them had a table with server-side pagination, sorting and search. And every time, I wrote the same glue code around it: keep the offset and limit somewhere, debounce the search input, reset to the first page when the search changes, put the state in the URL so a refresh doesn't lose everything.

At some point I realized I've written this code many times, in different projects, and more than once I shipped the same bug: the user searches while they are on page 4, the results fit in one page, and the table shows an empty page 4. No error, nothing. Just an empty table.

So I finally wrote it once, properly, and made it a small open source package. It's called use-server-table. It's a headless React hook, so it has no UI at all — you keep your own table components and your own data fetching (I use it with TanStack Query). It handles pagination, sorting, debounced search and URL sync, and there is a small adapter if you use TanStack Table. My favourite part: every unit test in the repo is a bug I actually shipped at some point.

It's a first version and I'm sure the API can be better, so I'd really appreciate feedback. And I'm curious — what's the table bug that got you in production?

Code and npm link are in the first comment.

---

## Notes

- Personal claims ("almost every one of them", "more than once I shipped") — adjust these to whatever is actually true for you. True details always read better and you'll defend them in comments.
- No hashtags, no emojis, no bullet points — same as your Vue post, and that one did 25k without them.
- Kept "favourite" (you write British English).
- If you want it shorter, the third paragraph can lose the TanStack adapter sentence.

## Posting playbook (unchanged)

1. Link in the first comment, not the post body.
2. Post when you can reply to comments for the first 60–90 minutes.
3. Reply to every war story in the comments — and actually add test cases from them. That's your follow-up post: "You reported your table bugs, I turned them into tests."
4. Polish the README and push to GitHub/npm before posting.
