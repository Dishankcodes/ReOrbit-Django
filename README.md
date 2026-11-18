<p align="center">
  <img src="frontend/public/images/brand/reorbit-globe-192.png" width="96" alt="ReOrbit" />
</p>

<h1 align="center">ReOrbit</h1>
<p align="center"><b>Reuse · Recreate · Reimagine</b><br/>A circular marketplace where pre-loved things get a second life.</p>

<p align="center">
  <a href="https://dishankcodes-reorbit.vercel.app/">Live site</a> ·
  <a href="https://dishankcodes-reorbit.vercel.app/remakers">ReMakers</a>
</p>

---

## What ReOrbit is

ReOrbit connects three kinds of people around the life of an everyday item:

| Side | What they do |
| --- | --- |
| **Members** | Sell things they no longer use, buy pre-loved finds, donate items for free pickup, review orders and earn Orbit Points, badges and vouchers. |
| **ReMakers** | Makers and artists who buy rescued pieces, turn them into new creations and sell them from their own studio page, with followers, reviews and analytics. |
| **ReOrbit team (admin)** | Looks after accounts, listings, orders, donations, pickups, the warehouse, payouts, rewards, content and support, with role-based access for every team member. |

## How an item moves

```
List / donate  →  ReOrbit pickup (optional)  →  Order and delivery  →  Payment held  →  Clears to the seller's wallet
                                   ↘ donation  →  warehouse  →  ReOrbit store
```

- **Selling.** A member or ReMaker lists an item with photos, condition, price, city and pincode. It goes live straight away. The team can flag it, switch it off or suggest a fairer price.
- **Delivery.** The seller ships it themselves, or picks **Managed by ReOrbit**: they pack it, ask for a pickup, and ReOrbit's pickup team collects it and delivers it.
- **Payment.** Buyers pay online (Razorpay) or by cash on delivery. A seller's money is held until delivery, waits 7 days for returns, then clears to their wallet for withdrawal.
- **Donations.** A member offers items and the team reviews them. A free pickup is booked and the items reach the warehouse. The donor gets Orbit Points, sometimes a voucher, and a downloadable certificate.
- **After delivery.** Buyers have 7 days to return an order. They can review the product once and the seller once. Reviews can be reported and moderated.

## Feature tour

**Members**
- Marketplace with search, filters (category, condition, price, seller type), wishlist, cart and checkout.
- Voucher and coupon codes at checkout.
- Selling: listings with real views and saves, sales, ReOrbit pickup or self-shipping, wallet and payouts.
- Donations with pickup scheduling, history and certificates.
- Orbit Points, levels (Seedling → Champion), badges shown on their public seller profile, rewards and vouchers.
- Reviews, messages with sellers, reports with answers from the team, support tickets.
- A dashboard whose sections load as you scroll.

**ReMakers**
- A studio page with portfolio, followers, ratings and a "rescued" count (pieces bought from members).
- Product management, sales and order handling, the same ReOrbit pickup, payouts.
- Analytics: views, saves, orders, revenue, traffic sources, best hours and a conversion funnel.
- Coupon codes at checkout. ReMakers can follow other ReMakers.

**ReOrbit team**
- A dashboard plus modules for users, ReMakers, products, orders, returns, donations, pickups and pickup teams, warehouse, ReOrbit's own store, earnings and payouts, rewards and vouchers, reviews and complaints, support tickets and website messages, notifications and announcements, content, and settings.
- Content covers banners, FAQs, versioned policies, Home spotlights, testimonials and featured ReMakers.
- A super admin creates roles and gives each team member view or edit access per module.
- Every sensitive action is written to an audit log.

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | React 19, Vite 6, React Router 7, lucide-react, Recharts |
| Backend | Django 6, Django REST Framework, SimpleJWT, PostgreSQL |
| Payments | Razorpay (online) and cash on delivery |
| Email | SMTP or Mailjet (OTP codes, receipts, branded emails) |
| Auth | Email and password with OTP for sign-up and password reset, Google sign-in |

## Project layout

```
backend/
  reorbit/            settings and URLs
  apps/
    accounts/ users/ remakers/ admins/   accounts, profiles, permissions
    listings/ orders/ payments/ earnings/ pickups/
    donations/ warehouse/ rewards/ reviews/ complaints/
    social/ messaging/ notifications/ support/ content/ analytics/ platform/ core/
frontend/
  src/
    user/  remaker/  admin/   one app per side
    shared/                    components, hooks and helpers used by all three
    api/                       API client
```

## Accounts and privacy

- Account status is enforced by the server: active, suspended or blocked. A suspended or blocked account can still reach support.
- **Deleting an account** starts a 30-day grace period. Signing in again within 30 days cancels the deletion. After that, the account is closed and personal details are removed. Orders, payments and donations are kept for records, without personal details.

## Brand

The ReOrbit globe-and-orbit mark lives in `frontend/public/images/brand/`.

---

<p align="center">Made with care for a circular future 🌱</p>
