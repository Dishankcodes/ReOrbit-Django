from django.db import models


class OTP_Verification(models.Model):
    """Hashed one-time codes. The raw code is never stored.

    A code is valid until `expires_at`, allows at most 5 wrong attempts, and can be
    used once. `consumed_at` is set when the code is used up or burned.
    """

    class Purpose(models.TextChoices):
        REMAKER_REGISTER = "remaker_register", "ReMaker Registration"
        REMAKER_LOGIN = "remaker_login", "ReMaker Login"
        USER_FORGOT_PASSWORD = "user_forgot_password", "User Forgot Password"

    class AccountType(models.TextChoices):
        USER = "user", "User"
        REMAKER = "remaker", "ReMaker"

    otp_id = models.BigAutoField(primary_key=True)
    email = models.EmailField(max_length=255)
    account_type = models.CharField(
        max_length=10, choices=AccountType.choices, default=AccountType.USER
    )
    otp_hash = models.CharField(max_length=255)
    purpose = models.CharField(max_length=40, choices=Purpose.choices)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)
    attempts = models.PositiveSmallIntegerField(default=0)
    consumed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "otp_verification"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["email", "purpose", "created_at"],
                name="otp_email_purpose_created_idx",
            ),
        ]
