from rest_framework_simplejwt.tokens import RefreshToken


def create_token_pair(account_type, account_id):
    refresh = RefreshToken()
    refresh["account_type"] = account_type
    refresh["account_id"] = int(account_id)

    access = refresh.access_token
    access["account_type"] = account_type
    access["account_id"] = int(account_id)

    return {
        "access": str(access),
        "refresh": str(refresh),
    }
