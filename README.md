# Gerald & Girlie — Our next adventure

A one-page wedding invitation with an animated envelope and letter, six immersive chapters, scroll parallax, a photo scrapbook, an entourage, attire references, guest notes, and a closing invitation. No navbar or conventional footer.

Run `npm install`, then `npm run dev`. Production: `npm run build`.

## Remaining supplied details

- The supplied **“Been So Good” piano cover by James Wong** is included in `public/audio/been-so-good-keyboard-v2.mp3`. It streams when “Begin our adventure” on the letter is clicked, loops at 100% volume, and can be paused or resumed with the music pill. The slider controls volume; failed downloads can be retried.
- Three additional groomsmen are pending. Add their names to the groomsmen list in `index.html` when supplied.
- Attire references are labeled for the entourage; the guest dress code has not been confirmed.
- The closing invitation displays one reserved seat. No RSVP endpoint or deadline was provided, so the page does not collect or pretend to submit responses.
- Directions use a venue search until an exact map pin is supplied.

The countdown and calendar invitation use 3 PM Philippine time on December 18, 2026. Motion respects the operating system’s reduced-motion preference. Photographs and attire references are locally stored, optimized copies of the supplied assets.

Social link previews use `public/og-wedding.jpg` at 1200 × 630, with the production URL `https://gerald-and-girlie.vercel.app/`. Photographs use WebP with 640px mobile alternatives, lazy loading below the first scene, and explicit dimensions. Vercel serves static assets with cache headers. Generated assets are checked in, so production builds require no media processing.

Run `npm test` for music controls and local asset references, then `npm run build` to validate the production bundle.
