# ReOrbit: how the three sides now connect (front-end demo)

Admin is the source of truth. User and ReMaker read it through `src/shared/`:

| File | What it gives User and ReMaker |
|---|---|
| `commerce.js` | Platform fee (paid by the buyer), delivery, free-delivery limit, COD limit from Admin > Settings |
| `catalog.js` | Categories from Admin > Content |
| `content.js` | FAQs, policy text (with {tokens}), banners from Admin > Content |
| `announcements.js` + `components/AnnouncementSync.jsx` | Admin announcements in each app's notifications |
| `accountStatus.js` + `components/AccountGate.jsx` | Suspended (read-only banner) and Blocked/Deleted (locked screen, can still contact support) |
| `moderation.js` | Admin deactivation reason and suggested price shown on a ReMaker's products |
| `complaints.js` + `components/ReportButton.jsx` | "Report" buttons send complaints to Admin > Complaints |
| `rewardRules.js` | Orbit Points rules and vouchers from Admin > Rewards |
| `identity.js` | Which admin account the logged-in demo user/ReMaker maps to (by email) |

New admin page: **Support** (`/admin-support`), one inbox for User and ReMaker help tickets. Replies show in the member's ticket.

Sellers keep the full price. The buyer pays the platform fee on member orders (none on ReOrbit's own listings).
Everything is in-memory or localStorage. When the backend arrives, swap the store functions for API calls.


## Listing flow (final)
Members publish listings and they go live immediately. There is no verify / reject / pending step by admin.
Admin can still turn a live listing off (with a reason) or suggest a price; the member sees both on their listing.
Published listings appear in the user marketplace, the ReMaker marketplace and Admin > Products at once.
Donations keep their admin review/accept/reject step.
