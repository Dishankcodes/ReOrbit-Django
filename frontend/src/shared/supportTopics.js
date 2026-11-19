/* =========================================================
   Support topics: what to suggest when someone writes in, and what
   the ticket can be linked to.

   - TOPIC_IDEAS: five tap-to-add sentences per member topic
     (/user-help/contact), so people describe the problem faster.
   - REPLY_IDEAS: five tap-to-add replies per topic for the team
     (/admin-support/:ticketId).
   - TOPIC_REFS: which of the member's things a topic can point to:
     orders they bought, orders they sold, or their own listings.
   ========================================================= */

export const LISTING_TOPIC = "A listing I'm selling";

export const TOPIC_IDEAS = {
  "Order or delivery": [
    "My order hasn't arrived yet.",
    "The tracking hasn't updated for a few days.",
    "The item arrived damaged.",
    "I received the wrong item.",
    "I'd like to cancel this order.",
  ],
  "Payment or refund": [
    "I was charged but the order didn't go through.",
    "I haven't received my refund yet.",
    "I was charged twice for the same order.",
    "My cash on delivery payment isn't showing.",
    "Please check the amount I was charged.",
  ],
  "Selling or payouts": [
    "My payout for this sale hasn't arrived.",
    "The buyer hasn't confirmed delivery yet.",
    "I need help shipping this order.",
    "The buyer wants to return the item.",
    "Please check my earnings for this sale.",
  ],
  [LISTING_TOPIC]: [
    "ReOrbit turned off my listing and I'd like to know why.",
    "I've fixed what was flagged. Please review it again.",
    "I'd like to talk about the suggested price.",
    "My listing isn't showing in the marketplace.",
    "I can't edit or update my listing.",
  ],
  "Donation pickup": [
    "My pickup hasn't been scheduled yet.",
    "The pickup person didn't come.",
    "I'd like to change my pickup date.",
    "I want to cancel my donation.",
    "I didn't get points for my donation.",
  ],
  "Account or login": [
    "I can't sign in to my account.",
    "I'm not getting the email code.",
    "I want to change my email address.",
    "My account was suspended and I'd like to know why.",
    "I want to delete my account.",
  ],
  "Orbit Points": [
    "Some of my points are missing.",
    "I didn't get points for a purchase.",
    "My reward code isn't working.",
    "My points balance looks wrong.",
    "How do I use my points?",
  ],
  Other: [
    "I have a suggestion for ReOrbit.",
    "I found a bug on the website.",
    "I'd like to report a member.",
    "I need help using a feature.",
    "I have a question about ReOrbit.",
  ],
};

const GENERAL_REPLIES = [
  "Thanks for reaching out. We're looking into this now.",
  "Could you share a screenshot or photo so we can check?",
  "We've fixed this on our side. Please check and let us know.",
  "Sorry for the trouble, and thanks for your patience.",
  "We'll update you here as soon as we hear back.",
];

export const REPLY_IDEAS = {
  "Order or delivery": [
    "We've contacted the courier and will update you within 24 hours.",
    "Your order is on its way. The tracking should update soon.",
    "Please share a photo of the item and the package.",
    "We've cancelled the order. The refund will follow if you paid online.",
    "Sorry about this. We're arranging a return for you.",
  ],
  "Payment or refund": [
    "Your refund has been started. It usually reaches you in 5 to 7 working days.",
    "We can see the payment and are checking it with the payment provider.",
    "Please share the payment reference or a screenshot of the charge.",
    "The extra charge will be returned to the same payment method.",
    "Your cash on delivery payment is now confirmed.",
  ],
  "Selling or payouts": [
    "Your payout is scheduled and will reach your account soon.",
    "Payouts are released after the return window closes.",
    "Please check that your bank or UPI details are correct in Wallet.",
    "We've asked the buyer to confirm delivery.",
    "Here's how to pack and ship this order safely.",
  ],
  [LISTING_TOPIC]: [
    "We've reviewed your listing and turned it back on.",
    "Please add clear photos of the actual item, then reply here.",
    "The price was suggested because similar items sell for less.",
    "Your listing is live again. Thanks for updating it.",
    "This listing can't go back on because it breaks our listing rules.",
  ],
  "Donation pickup": [
    "We've scheduled your pickup. You'll get the date by email.",
    "Sorry the pickup was missed. We've booked a new slot.",
    "Your pickup date has been changed.",
    "Your donation has been cancelled.",
    "Your donation points have been added.",
  ],
  "Account or login": [
    "Please try Forgot password on the sign-in page.",
    "Please check your spam folder for the email code.",
    "Your account is active again. You can sign in now.",
    "We've updated your account details.",
    "To keep your account safe, please reply from your account email.",
  ],
  "Orbit Points": [
    "We've added the missing points to your account.",
    "Points for purchases arrive after the order is delivered.",
    "Your reward code has been reissued.",
    "Your points balance is correct. Here's the breakdown.",
    "You can use points at checkout or on the Rewards page.",
  ],
};

/* ReMaker tickets use their own topic names */
const SAME_AS = {
  "Orders and shipping": "Order or delivery",
  "Earnings and payouts": "Selling or payouts",
  "Products and listings": LISTING_TOPIC,
  "Account and security": "Account or login",
};

export const replyIdeasFor = (topic) => REPLY_IDEAS[SAME_AS[topic] || topic] || GENERAL_REPLIES;

/* bought: orders they bought · sold: orders they sold · listings: their own listings */
export const TOPIC_REFS = {
  "Order or delivery": ["bought", "sold"],
  "Payment or refund": ["bought", "sold"],
  "Selling or payouts": ["sold", "listings"],
  [LISTING_TOPIC]: ["listings"],
};
