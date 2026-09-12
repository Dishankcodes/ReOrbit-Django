from django.db import models


class OTP_Verification(models.Model):

    class Purpose(models.TextChoices):
        REMAKER_REGISTER = "remaker_register", "ReMaker Registration"
        REMAKER_LOGIN = "remaker_login", "ReMaker Login"
        USER_FORGOT_PASSWORD = (
            "user_forgot_password",
            "User Forgot Password",
        )

    otp_id = models.BigAutoField(primary_key=True)

    email = models.EmailField(max_length=255)

    otp_hash = models.CharField(max_length=255)

    purpose = models.CharField(max_length=40, choices=Purpose.choices)

    expires_at = models.DateTimeField()

    is_verified = models.BooleanField(default=False)

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
