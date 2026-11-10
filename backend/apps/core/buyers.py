"""A buyer can be a member, a ReMaker or an admin.

Orders and payments keep one real foreign key per account table (so the database
guards them) plus `buyer_type` and `buyer_key` ("user:5"), which every lookup uses.
"""

BUYER_TYPES = ("user", "remaker", "admin")

# where each kind of buyer follows an order in the app
ORDER_PATH = {"user": "/user-orders", "remaker": "/remaker-orders", "admin": "/admin-shop-orders"}


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


def info(obj):
    b = get(obj)
    return {"type": obj.buyer_type, "id": b.public_id, "name": b.full_name, "email": b.email}


def order_url(obj):
    return f"{ORDER_PATH[obj.buyer_type]}/{obj.public_id}"


def owner(account):
    """Filter/create kwargs for SavedAddress: {"user": a} / {"remaker": a} / {"admin": a}."""
    return {type_of(account): account}
