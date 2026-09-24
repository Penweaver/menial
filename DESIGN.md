# MENIAL — DESIGN SYSTEM SPECIFICATION (DESIGN.md)

> **Brand Direction:** Dignified Utility  
> **Target Demographic:** Mobile Worker Marketplace (Nigeria / Emerging Markets)  
> **Core Interfaces:** Mobile App (Employer & Worker), Web Dashboard (Admin & Superadmin)  
> **Reference Authority:** [menial-master-spec-v2.md](file:///c:/Projects/menial/menial-master-spec-v2.md) (Section 7) & Stitch Project (`projects/14842649942348764018`)

---

## 1. Design System Overview & Philosophy

The **menial** design system is engineered specifically for high-frequency, on-demand physical and service labor marketplaces operating in emerging economies. The overarching visual concept is **"Dignified Utility"**—a design ethos that balances the financial reliability of modern fintech with the speed, physical clarity, and touch ergonomics of leading mobility platforms.

### Core Visual Pillars

1. **Dignity of Labour:** Elevates every artisan, tradesperson, and domestic worker. The interface intentionally rejects gig-economy clutter or condescending visual metaphors. Workers are presented as verified professionals with high-legibility profile cards, transparent wage representations, and proud status badging.
2. **Institutional Trust & Verification:** Unambiguous visual indicators for safety, identity verification (NIN/BVN alignment), escrow fund status, and skill validation. Color, iconography, and elevation work together to signal enterprise-grade security.
3. **Ergonomic Speed & Literacy Accessibility:** Designed for real-world outdoor conditions—direct bright sunlight, low-cost Android display hardware, and single-handed thumb operation. Features bold typography, high contrast, large touch targets (minimum 48px/52px), and icon-plus-label reinforcement to serve users across varying levels of digital literacy.

---

## 2. Stitch vs. Spec Cross-Check & Discrepancy Audit

A rigorous cross-check was conducted comparing the **Master Engineering Specification (Section 7)** against the auto-generated Material Design 3 tokens and templates in the **Stitch MCP Project** (`projects/14842649942348764018`). 

The key discrepancies flagged below **must be aligned to the Master Spec (Section 7)** during implementation.

### Key Discrepancy Matrix

| Design Token / Element | Master Spec (Section 7 Truth) | Stitch MCP Auto-Generated | Audit Result & Required Alignment |
| :--- | :--- | :--- | :--- |
| **Primary Brand Color** | `#1A4FEE`<br>*(Electric Royal Cobalt)* | `#003624`<br>*(Legacy MD3 green)* | ⚠️ **Brand Identity Update:** Official logo and app icon establish `#1A4FEE` (Electric Royal Cobalt) as core brand hue. **Enforce:** Use `#1A4FEE` as core `primary` for all main CTAs, headers, and active states. |
| **Secondary Color** | `#10B981`<br>*(Mint / Jade Kinetic Green)* | `#006C49`<br>*(Darker emerald shade)* | ⚠️ **Discrepancy:** Stitch MD3 palette mapped `secondary` to `#006C49` (though `#10B981` is in overrides). **Override:** Use `#10B981` strictly for verified badges, biometric checks, active online dots, and success. |
| **Tertiary Accent** | `#F59E0B`<br>*(Amber Gold)* | `#452900` / `#633d00`<br>*(Dark brown/amber)* | ⚠️ **Discrepancy:** Stitch auto-generated dark brown tertiary tokens. **Override:** Enforce vibrant `#F59E0B` for skill ratings, review stars, escrow hold warnings, and urgent alerts. |
| **Background / Canvas** | `#F8FAFC`<br>*(Slate-50 Warm Off-White)* | `#FAF8FF`<br>*(Cool/Lavender tinted white)* | ⚠️ **Discrepancy:** Stitch generated a purple/cool-tinted canvas. **Override:** Standardize on neutral Slate-50 `#F8FAFC` to eliminate glare under outdoor sunlight. |
| **Surface Containers** | `#FFFFFF` *(Card Base)*<br>`#F1F5F9` *(Slate-100 Inputs)* | `#EAEDFF` / `#DAE2FD`<br>*(Periwinkle/Cool containers)* | ⚠️ **Discrepancy:** Stitch MD3 auto-palette used bluish tint containers. **Override:** Use crisp `#FFFFFF` for cards and warm `#F1F5F9` for inputs and segment tracks. |
| **Primary Text Color** | `#0F172A`<br>*(Midnight Slate)* | `#131B2E`<br>*(Dark Navy)* | ℹ️ **Minor Difference:** `#0F172A` offers superior contrast against off-white canvas without harshness. Use `#0F172A`. |
| **Typography Family** | **Plus Jakarta Sans** | **Plus Jakarta Sans** | ✅ **MATCH:** Both spec and Stitch align on Plus Jakarta Sans across all roles. |
| **Card Radii** | 12px – 16px (`1rem`) | `lg` = 8px (`0.5rem`), `xl` = 12px | ⚠️ **Discrepancy:** Stitch mapped `lg` to 8px. **Override:** Use 16px (`1rem`) for main cards and bottom sheets; 8px for inputs and buttons. |
| **Touch Targets** | Minimum 48px – 52px | 48px – 52px | ✅ **MATCH:** Both specify minimum 48px physical hit areas (52px CTAs). |

---

## 3. Color Palette & Semantic Roles

The color system leverages deep psychological associations with prosperity, stability, and institutional trust in West African and global markets.

### Color Tokens & Usage Specification

```
├── Primary: Electric Royal Cobalt (#1A4FEE) ──► Core Brand, App Bars, Main CTAs
├── Secondary: Mint / Jade (#10B981)         ──► Verification Badges, Success, Online Dots
├── Tertiary: Amber Gold (#F59E0B)           ──► Ratings (Stars), Escrow Hold, Warnings
├── Neutral Dark: Midnight Slate (#0F172A)   ──► Headings, High-Contrast Body Text
├── Neutral Muted: Slate Grey (#64748B)      ──► Captions, Secondary Metadata, Borders (#E2E8F0)
└── Canvas Base: Slate-50 (#F8FAFC)          ──► Outdoor Warm Background, Card Surfaces (#FFFFFF)
```

#### Detailed Color Roles

* **Primary (`#1A4FEE` — Electric Royal Cobalt):**
  * *Roles:* Main application bar background, primary action buttons (`ButtonFilled`), active tab/nav states, brand headers, active radio buttons.
  * *On-Primary:* `#FFFFFF` (Pure White).
  * *Container Fill:* `#EBF1FE` (Soft Cobalt 50 tint), *Hover:* `#1440C7`.
* **Secondary (`#10B981` — Mint Jade):**
  * *Roles:* Verified worker shield badges, biometric checkmarks, active "Available Now" indicators, cashout success toasts, completed job pills.
  * *Container Fill:* `#ECFDF5` (Mint 50 tint), *Text/Icon:* `#065F46`.
* **Tertiary (`#F59E0B` — Amber Gold):**
  * *Roles:* Rating stars (e.g., `★ 4.9`), escrow fund holding pills ("In Escrow"), dispute alert banners, priority job tags.
  * *Container Fill:* `#FEF3C7` (Amber 50 tint), *Text/Icon:* `#92400E`.
* **Neutral Surface & Text Hierarchy:**
  * **Canvas Background:** `#F8FAFC` (Slate 50) — Eliminates screen glare.
  * **Card Surface:** `#FFFFFF` — Elevates actionable cards above canvas.
  * **Subtle Container:** `#F1F5F9` (Slate 100) — Input backgrounds, inactive segments, disabled button states.
  * **Border / Tracing:** `#E2E8F0` (1px solid border on cards and inputs).
  * **Primary Text:** `#0F172A` (Midnight Slate) — 100% contrast reading text.
  * **Secondary Text:** `#64748B` (Slate 500) — Job categories, timestamps, metadata labels.

---

## 4. Typography Rules & Financial Formatting

The platform standardizes on **Plus Jakarta Sans** across all operating systems to ensure consistent geometric apertures, maximum legibility on low-PPI screens, and clean localized layout behavior.

### Type Scale Specification

| Token Name | Font Weight | Size (px) | Line Height (px) | Tracking / Features | Primary Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `headline-lg` | 700 (Bold) | 32px | 40px | -0.02em | Desktop Dashboard Titles, Onboarding Headers |
| `headline-lg-mobile` | 700 (Bold) | 26px | 32px | -0.01em | Mobile Screen Titles, Wallet Balance Header |
| `headline-md` | 700 (Bold) | 22px | 28px | Normal | Card Group Headers, Modal Titles |
| `headline-sm` | 600 (SemiBold) | 18px | 24px | Normal | Worker Name in List, Job Title Header |
| `body-lg` | 500 (Medium) | 16px | 24px | Normal | Form Inputs, Primary Mobile Paragraphs |
| `body-md` | 400 (Regular) | 14px | 20px | Normal | Standard Body Copy, Job Descriptions |
| `body-sm` | 400 (Regular) | 12px | 16px | Normal | Help Text, Subtitles, Timestamps |
| `label-lg` | 600 (SemiBold) | 15px | 20px | +0.01em | Button Labels, Tab Bar Labels |
| `label-md` | 600 (SemiBold) | 13px | 18px | +0.02em | Filter Chips, Category Pills |
| `label-sm` | 700 (Bold) | 11px | 14px | +0.05em (UPPERCASE)| Micro Status Pills, Trust Tags |
| `currency-display` | 800 (ExtraBold) | 28px | 34px | `font-variant-numeric: tabular-nums` | Payout Amounts, Escrow Totals, Wage Rates |

### Formatting Rules

1. **Monetary Values & Currency Symbol (Naira `₦`):**
   * All monetary figures across all components must use tabular figures (`font-variant-numeric: tabular-nums` / `tnum`) to eliminate width jitter when values change dynamically.
   * Monies are stored as integer **kobo** (1 NGN = 100 kobo). When rendered in UI, format as `₦XX,XXX` with equal structural weight on the `₦` symbol as the numbers.
2. **Casing & Branding Rules:**
   * Brand name must strictly render in lower-case: **"menial"**.
   * Page titles and section headers use standard Title Case or Sentence Case.
   * ALL-CAPS is strictly restricted to `label-sm` micro status pills (e.g., `VERIFIED`, `IN ESCROW`, `PENDING`).

---

## 5. Layout, Spacing, Radii & Ergonomics

### 8-Point Base Grid Model

Layouts adhere to an 8-point base grid for macro structure, with 4-point steps for micro alignments.

* **Micro Spacing (`space-xs`):** 4px (`0.25rem`) — Badge padding, icon-to-label gaps.
* **Small Spacing (`space-sm`):** 8px (`0.5rem`) — Stack gaps within cards.
* **Medium Spacing (`space-md`):** 12px (`0.75rem`) — Mobile grid gutters.
* **Large Spacing (`space-lg`):** 16px (`1.0rem`) — Card internal padding, mobile outer margins (`margin-mobile`).
* **Extra-Large Spacing (`space-xl`):** 24px (`1.5rem`) — Section gaps, desktop margins (`margin`).

### Corner Radius System

* **Small (`rounded-sm` / 4px):** Checkbox boxes, micro tags.
* **Standard (`rounded-md` / 8px):** Form text inputs, standard action buttons, image thumbnails, map containers.
* **Container / Card (`rounded-lg` / 16px):** Worker profile cards, job request cards, bottom modal sheet top corners.
* **Pill (`rounded-full` / 9999px):** Status chips, trust verification badges, category filter chips, main Floating Action Buttons (FABs).

### Elevation & Layering

To maintain extreme clarity in bright outdoor environments, visual hierarchy relies on soft borders (`1px solid #E2E8F0`) combined with subtle ambient shadows rather than heavy dark drop shadows:

* **Level 0 (Flat Canvas):** `#F8FAFC` base page surface.
* **Level 1 (Card Elevation):** `#FFFFFF` surface with `border: 1px solid #E2E8F0` and shadow: `0px 2px 4px rgba(15, 23, 42, 0.04)`.
* **Level 2 (Sticky Headers & App Bars):** `#FFFFFF` surface with `shadow: 0px 4px 12px rgba(11, 79, 55, 0.06)`.
* **Level 3 (Modal Sheets & Drawer Panels):** `#FFFFFF` surface with `shadow: 0px 12px 32px rgba(15, 23, 42, 0.12)` over a 40% opacity Midnight Slate (`#0F172A`) backdrop scrim.

---

## 6. Core Component System

### Buttons

1. **Primary Action Button:**
   * *Height:* 52px (Full-width on mobile).
   * *Background:* Electric Royal Cobalt (`#1A4FEE`).
   * *Text:* `#FFFFFF`, `label-lg` (15px SemiBold).
   * *Radius:* 12px (`rounded-md` / `rounded-xl`).
   * *Touch Target:* Padded hit area 52px. Active state scales down `scale(0.98)`.
2. **Secondary Outlined Button:**
   * *Height:* 52px.
   * *Background:* `#FFFFFF`.
   * *Border:* `1.5px solid #1A4FEE`.
   * *Text:* `#1A4FEE`, `label-lg`.
3. **Escrow / Cash Out Button (Kinetic CTA):**
   * *Background:* Linear gradient `linear-gradient(135deg, #1A4FEE 0%, #4F7EFA 100%)`.
   * *Text:* Crisp `#FFFFFF` with embedded Naira value in tabular figures.

### Form Inputs

* *Height:* 52px.
* *Background:* `#F8FAFC` (Slate 50).
* *Border:* `1.5px solid #E2E8F0`.
* *Text:* `body-lg` (16px) in `#0F172A`.
* *Focus State:* `border: 2px solid #1A4FEE` with inner surface turning `#FFFFFF`.
* *Touch Ergonomics:* Clear button `(X)` and password visibility toggles strictly padded to 48x48px touch targets.

### Trust Chips & Verification Badges

* **Verified Worker Badge:**
  * Pill container (`rounded-full`), 28px height.
  * *Fill:* `#ECFDF5` (Mint 50), *Text/Icon:* `#065F46`.
  * *Icon:* Shield contour containing unbroken SVG checkmark.
* **Rating Pill:**
  * Pill container, 24px height.
  * *Fill:* `#FEF3C7` (Amber 50), *Text/Icon:* `#92400E`.
  * *Content:* `★ 4.9 (42 jobs)`.
* **In Escrow / Pending Badge:**
  * Pill container.
  * *Fill:* `#F0F9FF` (Sky 50), *Text/Icon:* `#0369A1`.

### Cards

1. **Worker Listing Card:**
   * `#FFFFFF` surface, 16px radius, 16px internal padding, `1px solid #E2E8F0`.
   * Left: Worker Avatar (56x56px, 8px radius) with an overlapping absolute Mint Verified Dot (12x12px).
   * Middle: Name in `headline-sm`, Service Category in `label-md` (`#64748B`), Distance Chip ("1.2 km away").
   * Right Top: Hourly/Daily Rate in `label-lg` tabular figures (`₦3,500/hr`).
2. **Job Request Card:**
   * Includes Category Icon badge, Job Title, Address summary, Time Window, proposed pay, and "Accept Job" or "Hire Worker" primary CTA.

---

## 7. Recurring Layout Patterns Across User Roles

The Menial platform spans 4 distinct user role interfaces operating on the same backend.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MENIAL PLATFORM SYSTEM                          │
├───────────────────────────────────┬────────────────────────────────────┤
│         MOBILE APPLICATION        │           WEB DASHBOARD            │
├─────────────────┬─────────────────┼──────────────────┬─────────────────┤
│    EMPLOYER     │     WORKER      │      ADMIN       │   SUPERADMIN    │
│  (Hire & Pay)   │ (Work & Earn)   │ (Ops Command)    │  (Governance)   │
└─────────────────┴─────────────────┴──────────────────┴─────────────────┘
```

### A. Employer Mobile App Flow
* **Discovery & Search (Home):** Top sticky header with location selector. Category icon grid (Cleaning, Moving, Gardening, Laundry, etc.). Horizontal carousel of "Top Verified Workers Nearby".
* **Create Job Flow:** Stepper interface (Category -> Job Description & Worker Count -> Location & Schedule -> Budget Input). Clean price breakdown showing Worker Pay + Platform Fee = Total Escrow Amount in NGN.
* **Hiring & Payment Checkout:** Direct card/bank checkout screen with escrow badge. Clear messaging: *"Funds held securely in escrow until job completion is confirmed."*
* **Active Job Tracking:** Map view with worker arrival check-in status, direct call/message buttons, and safety SOS button.

### B. Worker Mobile App Flow
* **Worker Profile & Verification Onboarding:** Multi-step verification wizard (NIN / BVN verification, ID photo upload, service category selection, service area radius). Clear status indicators (`PENDING VERIFICATION`, `VERIFIED PRO`).
* **Job Feed & Instant Acceptance:** Distance-sorted list of nearby job opportunities with instant "Accept Job" CTA. Tap opens full job summary modal.
* **In-Progress Execution Screen:** Big touch button for **"Mark Arrived at Location"**, job checklist, safety check-in, and final **"Request Job Completion"**.
* **Earnings & Wallet Dashboard:** Financial card displaying Available Balance (`₦XX,XXX`), Escrow Pending, and Earnings History. Instant "Cash Out to Bank" CTA.

### C. Admin Dashboard (Desktop Web)
* **Layout:** Desktop-first split view. Fixed left navigation sidebar (`#0F172A` midnight background or clean white with emerald active pills) + top header bar with quick search & notifications.
* **Operations Command Center:** High-level metric cards (Active Jobs, Pending Verifications, Open Disputes, Daily GMV).
* **Worker Verification Queue:** Dual-pane layout. Left: Scrollable queue of pending workers. Right: Document inspector (NIN match score, photo preview, manual Approve / Reject buttons with reason dropdown).
* **Dispute Resolution Panel:** Side-by-side comparison of Employer vs. Worker claims, job timeline audit log, and Escrow Refund / Release action triggers.

### D. Superadmin Dashboard (Desktop Web)
* **Layout:** High-security governance layout with explicit red/emerald status banners.
* **Admin Management Matrix:** Table displaying all Admin accounts, role permissions, active status toggles, and "Create New Admin" modal.
* **Platform Governance & Audit Logs:** Immutable system event timeline (Role changes, platform fee updates, bulk payouts, security logs).
* **Global System Configuration:** Controls for platform fee percentages, system-wide maintenance mode toggles, and currency settings.

---

## 8. Implementation Guidelines for Engineers

1. **Tailwind / React Native Token Setup:**
   * Extend default theme with explicit hex codes from Section 3. Do not rely on default Material 3 palette generators.
   * Ensure `fontFamily` points to `Plus Jakarta Sans`.
2. **Accessibility & Outdoor Sunlight:**
   * Never drop body text contrast below 4.5:1 ratio against card surfaces.
   * Maintain minimum touch target heights of 48px for form elements and 52px for primary buttons.
3. **No Dynamic String Concatenation:**
   * Structure all copy as atomic phrases (Icon + Label) to facilitate future Nigerian Pidgin translation layers without code refactoring.
