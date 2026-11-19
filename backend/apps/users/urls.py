from django.urls import path
from .dashboard import MemberDashboard
from .export import MyDataExport
from .views import DeleteMyAccount
from .public_views import PublicMemberDetail
from .views import (
    RegisterRequestOTPView,
    RegisterView,
    LoginView,
    ForgotPasswordRequestOTPView,
    GoogleAuthView,
    ForgotPasswordVerifyOTPView,
    ForgotPasswordResetView,
    MeView,
    ProfileView,
    ProfilePhotoView,
    AdminUserList,
    AdminUserDetail,
    ChangePasswordView,
)

urlpatterns = [
    path("auth/register/request-otp/", RegisterRequestOTPView.as_view()),
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/", LoginView.as_view()),
    path("auth/google/", GoogleAuthView.as_view()),
    path("auth/forgot-password/request-otp/", ForgotPasswordRequestOTPView.as_view()),
    path("auth/forgot-password/verify-otp/", ForgotPasswordVerifyOTPView.as_view()),
    path("auth/forgot-password/reset/", ForgotPasswordResetView.as_view()),
    path("me/", MeView.as_view()),
    path("me/dashboard/", MemberDashboard.as_view()),
    path("me/delete/", DeleteMyAccount.as_view()),
    path("me/export/", MyDataExport.as_view()),
    path("public/<str:public_id>/", PublicMemberDetail.as_view()),
    path("profile/", ProfileView.as_view()),
    path("profile/photo/", ProfilePhotoView.as_view()),
    path("password/change/", ChangePasswordView.as_view()),
    path("admin/", AdminUserList.as_view()),
    path("admin/<str:public_id>/", AdminUserDetail.as_view()),
]
