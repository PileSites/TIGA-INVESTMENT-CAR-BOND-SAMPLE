# Tiga Investments Car Bond

A static, framework-free HTML, CSS and JavaScript dealership website. It can be hosted on any static web host and does not require a build step or runtime server.

## Files

- `index.html` — semantic page structure, metadata and dealership structured data.
- `styles.css` — design tokens, responsive layouts, and accessible interaction states.
- `app.js` — hash-based page navigation, guided vehicle finder, vehicle search and filters, saved examples, side-by-side comparison, touch-ready detail gallery, inquiry forms, and WhatsApp links.
- `vehicles.js` — structured vehicle records. Current entries are clearly identified as visual examples, not real stock.
- `config.js` — central business contact configuration and WhatsApp destination.
- `robots.txt` and `sitemap.xml` — basic crawler hints.

## Run locally

Open `index.html` in a browser. For local testing, a static file server is recommended, for example:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`. No package installation or compilation is required.

## Maintain business contacts

Edit `config.js`. Contact cards, footer phone links, structured contact metadata, and WhatsApp URLs are generated from this configuration. The WhatsApp number must use country code and digits only (for example, `256701704745`); it must not include a plus sign, spaces or punctuation.

Before publishing, confirm all contact information with dealership management.

## Add verified vehicle listings

Edit `vehicles.js` and add an object with a unique `id`, make/model, year, price and currency, mileage, fuel, transmission, engine, category, description, image URLs, `featured` and `dateAdded` fields. `status` supports `available` and `sample`. Only mark a vehicle `available` after the dealership confirms that it is real, accurately described, priced as stated, and available. Remove the sample entries before the live-stock launch or keep them explicitly marked as samples. Never treat demonstration data or its images as inventory.

Use photographs the dealership owns or is authorized to publish. Descriptive alt text is generated from the vehicle make and model. Image URLs should be optimized and stable.

Supported categories are populated from the vehicle data; the home page's category links can be changed to match dealership-confirmed categories.

## Forms and backend integration

The enquiry forms validate required browser fields and open a WhatsApp draft addressed to the configured sales contact. Visitors must review and send that draft themselves. No messages are stored or submitted to a server.

For server-side processing, replace the `openWhatsApp` form submission behavior in `app.js` with a request to a secured backend endpoint. Add server-side validation, consent and retention policies, rate limiting, and clear success/error feedback. Do not put secret keys in browser code.

## Browsing tools

The guided finder applies category, fuel and example-price preferences to the inventory filters. Visitors can save examples in browser storage and compare up to three examples side by side. Saved IDs stay on the current browser and device; vehicle data and enquiries are not sent to a backend. Comparison selections last until the page is closed.

The hero introduces the guided finder, while a reading-progress indicator, active navigation state, responsive dialogs, image gallery controls, and brief status messages provide feedback during browsing. Subtle hero parallax, card hover tilt, staggered vehicle reveals, and gallery crossfades add movement. Motion follows the reduced-motion preference and hover effects are disabled on touch devices.

## Deployment

Upload the files to the root of a static host. Configure the production domain in `index.html`'s canonical URL, Open Graph metadata, `sitemap.xml`, and any absolute structured-data URLs. Confirm the business address, opening hours, contact details, vehicle inventory, photo rights, and public URLs before launch. The map is deliberately a placeholder until management supplies a verified address and location.

Fonts and demonstration vehicle photographs are loaded from third-party URLs; self-host optimized, licensed assets for production and low-connectivity use.
