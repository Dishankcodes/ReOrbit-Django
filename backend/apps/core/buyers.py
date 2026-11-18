"""A buyer can be a member, a ReMaker or an admin.

Orders and payments keep one real foreign key per account table (so the database
guards them) plus `buyer_type` and `buyer_key` ("user:5"), which every lookup uses.
"""

BUYER_TYPES = ("user", "remaker", "admin")

# where each kind of buyer follows an order in the app
ORDER_PATH = {"user": "/user-orders", "remaker": "/remaker-orders", "admin": "/admin-shop/orders"}


def type_of(account):
    name = type(account).__name__
    return {"Users": "user", "ReMakers": "remaker", "Admins": "admin"}[name]


def key_of(account):
    return f"{type_of(account)}:{account.pk}"


def fields(account):
    """kwargs that attach `account` as the buyer of an Order or Payment."""
    t = type_of(account)
    return {"buyer_type": t, "buyer_key": key_of(account), f"buyer_{t}": account}


def get(obj):
    """The buyer account instance of an Order or Payment."""
    return getattr(obj, f"buyer_{obj.buyer_type}")


def info(obj, email=True):
    b = get(obj)
    d = {"type": obj.buyer_type, "id": b.public_id, "name": b.full_name}
    if email:  # sellers get the name only; admins also see the email
        d["email"] = b.email
    return d


def order_url(obj):
    return f"{ORDER_PATH[obj.buyer_type]}/{obj.public_id}"


def owner(account):
    """Filter/create kwargs for SavedAddress: {"user": a} / {"remaker": a} / {"admin": a}."""
    return {type_of(account): account}


def address_book(account):
    """Filter kwargs for the addresses this account can use. Admins share one book: ReOrbit's own
    addresses (Admin > Addresses), so any team member ships, buys and receives with the same ones."""
    if type_of(account) == "admin":
        return {"admin__isnull": False}
    return owner(account)


def reorbit_address():
    """ReOrbit's main address (the default one in Admin > Addresses) as a SavedAddress, or None."""
    from apps.core.models import SavedAddress

    return SavedAddress.objects.filter(admin__isnull=False).order_by("-is_default", "-updated_at", "pk").first()


def reorbit_address_data():
    a = reorbit_address()
    if a is None:
        return None
    return {"name": a.recipient_name, "phone": a.phone, "line1": a.address_line1, "line2": a.address_line2,
            "landmark": a.landmark, "city": a.city, "state": a.state, "pincode": a.pincode, "label": a.label}
