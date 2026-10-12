# Connect RSVP to Google Sheets

1. Create a project at https://script.google.com/ and paste `rsvp-google-apps-script.gs` into its editor. Run `setupRsvp` once under the Google account that should own the responses. Authorize the spreadsheet access when Google prompts. The execution log gives the new private spreadsheet link and `RSVP_SCRIPT_SECRET`.
2. Choose **Deploy → New deployment → Web app**. Execute as **Me**, access **Anyone**. The script accepts writes only with the secret and never exposes response data. Copy its deployment URL ending in `/exec`.
3. In the wedding project's Vercel **Settings → Environment Variables**, add `RSVP_SCRIPT_URL` (the deployment URL) and `RSVP_SCRIPT_SECRET` (the value from the execution log) for Production. Redeploy the latest commit. Keep the secret in Vercel, not in Git or the browser bundle.

The form stays unavailable until those settings exist. Submit one clearly labelled test RSVP, confirm its row in **Responses**, then delete that test row. Guests may respond without Google accounts. Each response contains Philippine time, name, attendance, reserved seats, message and a submission ID. Failed retries reuse the submission ID to avoid duplicate rows. The sheet remains private and can be downloaded as Excel through Google Sheets.

For local end-to-end checks, use Vercel's local development environment; Vite's static preview does not run `/api/rsvp`. The regular production build and Node tests still run locally.

References: [Google Apps Script web apps](https://developers.google.com/apps-script/guides/web), [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js).
