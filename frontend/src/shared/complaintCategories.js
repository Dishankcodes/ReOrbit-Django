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
