"""Cross-domain events. Domains talk through these signals, never by importing
each other's models.

Every event is sent with keyword arguments only. `sender` is the model class (or a
short string) that raised it. Payload keys are listed below and are part of the
contract (docs/API_CONTRACT.md).

  listing_published   listing_public_id, seller_type, seller_ref (e.g. "USR-1001")
  order_placed        order_public_id, buyer_ref
  order_delivered     order_public_id, buyer_ref, seller_refs (list)
  review_posted       review_public_id, reviewer_ref, seller_ref
  donation_received   donation_public_id, donor_ref
  donation_completed  donation_public_id, donor_ref
  ticket_opened       ticket_public_id, requester_ref
  report_filed        reporter_ref, target_type, target_ref, reason, description

A "ref" is the account public_id (USR-..., RMK-..., ADM-...) or a record public_id.
"""

import logging

from django.dispatch import Signal

logger = logging.getLogger(__name__)

listing_published = Signal()
order_placed = Signal()
order_delivered = Signal()
review_posted = Signal()
donation_received = Signal()
donation_completed = Signal()
ticket_opened = Signal()
report_filed = Signal()


def emit(signal, sender, **payload):
    """Send an event. A broken listener is logged and never breaks the caller."""
    for receiver, result in signal.send_robust(sender=sender, **payload):
        if isinstance(result, Exception):
            logger.error(
                "Event listener %r failed: %s", receiver, result, exc_info=result
            )
