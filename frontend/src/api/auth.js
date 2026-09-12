import { apiRequest } from "./api";

export function userRegister(payload) {
  return apiRequest("/users/auth/register/", {
    method: "POST",
    body: payload,
  });
}

export function userLogin(payload) {
  return apiRequest("/users/auth/login/", {
    method: "POST",
    body: payload,
  });
}

export function requestForgotPasswordOTP(email) {
  return apiRequest("/users/auth/forgot-password/request-otp/", {
    method: "POST",
    body: {
      email,
    },
  });
}

export function verifyForgotPasswordOTP(email, otp) {
  return apiRequest("/users/auth/forgot-password/verify-otp/", {
    method: "POST",
    body: {
      email,
      otp,
    },
  });
}

export function resetForgotPassword(resetToken, newPassword) {
  return apiRequest("/users/auth/forgot-password/reset/", {
    method: "POST",
    body: {
      reset_token: resetToken,
      new_password: newPassword,
    },
  });
}

export function refreshAccessToken(refreshToken) {
  return apiRequest("/auth/token/refresh/", {
    method: "POST",
    body: {
      refresh: refreshToken,
    },
  });
}

export function logoutUser(accessToken, refreshToken) {
  return apiRequest("/auth/logout/", {
    method: "POST",
    token: accessToken,
    body: {
      refresh: refreshToken,
    },
  });
}

export function adminLogin(payload) {
  return apiRequest("/admins/auth/login/", {
    method: "POST",
    body: payload,
  });
}
