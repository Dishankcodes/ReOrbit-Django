/* What can be reported, and why. The server checks the same lists, so a report
   can only use a reason that exists here. Shared by the member Report buttons
   and the admin Complaints screens. */

export const TARGET_TYPES = ["User", "ReMaker", "Product", "Review"];

export const CATEGORIES = {
  User: [
    "Scam or fraud",
    "Abusive behaviour",
    "Fake account",
    "Spam",
    "No-show or unreliable",
    "Other",
  ],
  ReMaker: [
    "Item not as described",
    "Late delivery",
    "Poor quality",
    "Scam or fraud",
    "Rude behaviour",
    "Counterfeit or copied work",
    "Other",
  ],
  Product: [
    "Misleading photos or description",
    "Unrealistic price",
    "Duplicate listing",
    "Prohibited or unsafe item",
    "Counterfeit or copied work",
    "Already sold",
    "Other",
  ],
  Review: [
    "Fake or paid review",
    "Abusive language",
    "Personal information",
    "Off-topic",
    "Other",
  ],
};

/* Tap-to-add sentences for the "Tell us what happened" box, picked by the reason chosen. */
export const REPORT_IDEAS = {
  "Scam or fraud": ["They asked me to pay outside ReOrbit.", "They took payment and stopped replying.", "The offer looked too good to be true."],
  "Abusive behaviour": ["They used insulting language in messages.", "They threatened me.", "They keep messaging after I said no."],
  "Rude behaviour": ["They were rude in messages.", "They refused to help with a problem."],
  "Fake account": ["The profile photo looks copied.", "The same person has another account.", "The name and details look made up."],
  Spam: ["They keep sending the same message.", "They post links to other sites."],
  "No-show or unreliable": ["They missed the agreed pickup.", "They cancelled at the last minute.", "They stopped replying."],
  "Item not as described": ["It looked different from the photos.", "The size or colour was wrong.", "It had damage that wasn't mentioned."],
  "Late delivery": ["It arrived much later than promised.", "It hasn't arrived yet.", "Tracking hasn't moved for days."],
  "Poor quality": ["It broke soon after it arrived.", "The finish is poor.", "It isn't usable."],
  "Counterfeit or copied work": ["This design is copied from another maker.", "It's sold as original but isn't.", "The brand looks fake."],
  "Misleading photos or description": ["The photos aren't of the real item.", "Important damage isn't mentioned.", "The condition is overstated."],
  "Unrealistic price": ["The price is far above similar items.", "The price looks like a mistake."],
  "Duplicate listing": ["The same item is listed more than once.", "This copies another seller's listing."],
  "Prohibited or unsafe item": ["This item isn't allowed on ReOrbit.", "It looks unsafe to use."],
  "Already sold": ["The seller told me it's already sold.", "It's listed here and sold elsewhere."],
  "Fake or paid review": ["The reviewer never bought this.", "It reads like a paid review.", "Many reviews look the same."],
  "Abusive language": ["The review insults the seller.", "It uses offensive words."],
  "Personal information": ["It shares a phone number or address.", "It names a private person."],
  "Off-topic": ["The review isn't about this product.", "It's an advert for something else."],
  Other: ["I'd like the team to take a look.", "Something here doesn't feel right."],
};
