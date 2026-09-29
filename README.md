# Dokan Zaman V3 Landing Page

**Live Website:** [Visit Dokan Zaman V3](https://ebthalgamal2020.github.io/dokan-zaman-landing-page-v3/)

**GitHub Repository:** [View Source Code](https://github.com/Ebthalgamal2020/dokan-zaman-landing-page-v3)

A one-page Arabic (right-to-left) landing page for **دكان زمان للتوريدات العمومية**, a general supplies company
("شريككم الموثوق في التوريدات والتشغيل"). It presents the company's supply categories, purchasing-management
service, target sectors, reasons to choose it, contract supply services and a quotation request form.

> **Published with GitHub Pages** from the root of the `main` branch. The page is open to search-engine indexing and
> declares its canonical URL (`<link rel="canonical">`) as the live address above.

## Technologies

- HTML5, one page (`index.html`), Arabic `lang="ar" dir="rtl"`
- Tailwind CSS 3.4.17, compiled ahead of time, plus hand-written component CSS
- Vanilla JavaScript (no framework, no runtime dependencies, no CDN), minified with terser
- Self-hosted fonts (SIL Open Font License): Readex Pro and Noto Naskh Arabic
- Accessibility: skip link, keyboard-operable menu and interactions, visible focus, `prefers-reduced-motion` support

## Run locally

Any static file server works. With Python:

```bash
python -m http.server 8080
# then open http://localhost:8080
```

The built files (`assets/css/site.min.css`, `assets/js/main.min.js`) are committed, so no build step is needed just
to view the page.

## Develop and build

Requires Node.js (for the two dev dependencies only).

```bash
npm install          # installs tailwindcss 3.4.17 and terser
npm run watch:css    # rebuild the CSS while editing
npm run build        # build site.min.css and main.min.js
```

| Script | What it does |
|---|---|
| `build:css` | `assets/css/style.css` → `assets/css/site.min.css` (Tailwind, minified) |
| `build:js` | `main.js` + `motion.js` + `quote-form.js` → `assets/js/main.min.js` (terser) |
| `build` | both of the above |

Edit the source files; the two minified files are build output.

## Project structure

```
index.html                     the page (all eleven sections)
package.json, package-lock.json, tailwind.config.js
assets/
  css/style.css                source styles (Tailwind layers + components)
  css/site.min.css             build output
  js/main.js                   header, mobile menu, reveal-on-scroll, ribbon, shared animation loop
  js/motion.js                 box-motif interactions: hero, categories, purchasing progress, About, sectors, services
  js/quote-form.js             quotation form validation and category/service preselection (prototype, sends nothing)
  js/main.min.js               build output
  fonts/                       Readex Pro, Noto Naskh Arabic (woff2, Arabic + Latin subsets)
  images/logo/                 official Dokan Zaman logo (SVG, unmodified)
  images/products/             temporary AI-generated product images (see the README in that folder)
```

## Page sections

Header (floating pill, mobile menu) · Hero · decorative moving ribbon · مجالات التوريد (supply categories with a
scroll-synchronised photo on desktop) · من نحن · إدارة عمليات المشتريات نيابة عنكم (six-stage purchasing progress) ·
القطاعات التي نخدمها (interactive sector stage) · لماذا دكان زمان؟ · خدمات الشركات والعقود (service navigator /
accordion) · اطلب عرض سعر (quotation form) · Footer.

The small box from the official logo is used as a recurring motif. It reuses the logo's own box paths, scaled
uniformly; the logo file itself is not changed.

## Quotation form: prototype

The quotation form **does not submit or store any data**. It uses `method="dialog"`, validates the fields in the
browser and then tells the visitor, in Arabic, that the request was not sent. No endpoint, email address or other
destination is configured. Quote links on each category and service preselect the matching option in the form.

## Content and image notes

- Company copy comes from the company's own materials; no contact details other than the city are published.
- All product photographs are **temporary AI-generated concept images**, not photographs of the company's products.
  They are marked as such in `assets/images/products/README.md` and are meant to be replaced.
