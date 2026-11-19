from django.db import models


class OTP_Verification(models.Model):
    """Hashed one-time codes. The raw code is never stored.

    A code is valid until `expires_at`, allows at most 5 wrong attempts, and can be
    used once. `consumed_at` is set when the code is used up or burned.
    """

    class Purpose(models.TextChoices):
        REMAKER_REGISTER = "remaker_register", "ReMaker Registration"
        REMAKER_LOGIN = "remaker_login", "ReMaker Login"
        USER_REGISTER = "user_register", "User Registration"
        USER_FORGOT_PASSWORD = "user_forgot_password", "User Forgot Password"
        ADMIN_FORGOT_PASSWORD = "admin_forgot_password", "Admin Forgot Password"
        PAYOUT_ACCOUNT = "payout_account", "Confirm payout details"

    class AccountType(models.TextChoices):
        USER = "user", "User"
        REMAKER = "remaker", "ReMaker"
        ADMIN = "admin", "Admin"

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


class LoginGuard(models.Model):
    """Wrong-password counter per email and role (see apps/accounts/login_guard.py).

    5 wrong tries lock that email for 5 minutes, the next lock 15 minutes, then 1 hour each time.
    A correct sign-in or a password reset clears the row. Kept per email, not per account, so an
    email with no account behaves exactly the same (nobody learns which emails are registered).
    """

    class Role(models.TextChoices):
        USER = "user", "User"
        REMAKER = "remaker", "ReMaker"
        ADMIN = "admin", "Admin"

    role = models.CharField(max_length=10, choices=Role.choices)
    email = models.CharField(max_length=255)
    failures = models.PositiveSmallIntegerField(default=0)  # wrong tries since the last lock
    locks = models.PositiveSmallIntegerField(default=0)  # how many times it has been locked recently
    locked_until = models.DateTimeField(null=True, blank=True)
    last_failure_at = models.DateTimeField(null=True, blank=True)
    last_ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "login_guard"
        constraints = [models.UniqueConstraint(fields=["role", "email"], name="login_guard_role_email")]
        indexes = [models.Index(fields=["locked_until"], name="login_guard_locked_idx")]

    def __str__(self):
        return f"{self.role}:{self.email}"
