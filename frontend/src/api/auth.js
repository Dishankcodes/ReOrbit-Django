import { apiRequest } from "./api";

// User registration.
export function userRegister(payload) {
  return apiRequest("/users/auth/register/", {
    method: "POST",
    body: payload,
  });
}

// User login.
export function userLogin(payload) {
  return apiRequest("/users/auth/login/", {
    method: "POST",
    body: payload,
  });
}

// Request user forgot-password OTP.
export function requestForgotPasswordOTP(email) {
  return apiRequest("/users/auth/forgot-password/request-otp/", {
    method: "POST",
    body: {
      email,
    },
  });
}

// Verify user forgot-password OTP.
export function verifyForgotPasswordOTP(email, otp) {
  return apiRequest("/users/auth/forgot-password/verify-otp/", {
    method: "POST",
    body: {
      email,
      otp,
    },
  });
}

// Reset user password.
export function resetForgotPassword(resetToken, newPassword) {
  return apiRequest("/users/auth/forgot-password/reset/", {
    method: "POST",
    body: {
      reset_token: resetToken,
      new_password: newPassword,
    },
  });
}

// Check whether ReMaker email already exists.
export function checkReMakerEmail(email) {
  return apiRequest("/remakers/auth/check-email/", {
    method: "POST",
    body: {
      email,
    },
  });
}

// Request ReMaker registration OTP.
export function requestReMakerRegistrationOTP(email, fullName, username) {
  return apiRequest("/remakers/auth/request-otp/", {
    method: "POST",
    body: {
      email,
      full_name: fullName,
      username,
      purpose: "remaker_register",
    },
  });
}

// Request ReMaker login OTP.
export function requestReMakerLoginOTP(email) {
  return apiRequest("/remakers/auth/request-otp/", {
    method: "POST",
    body: {
      email,
      purpose: "remaker_login",
    },
  });
}

// Verify ReMaker registration OTP and create account.
export function registerReMaker(payload) {
  return apiRequest("/remakers/auth/register/", {
    method: "POST",
    body: payload,
  });
}

// Verify ReMaker login OTP.
export function verifyReMakerLoginOTP(email, otp) {
  return apiRequest("/remakers/auth/login/verify-otp/", {
    method: "POST",
    body: {
      email,
      otp,
    },
  });
}

// Get logged-in ReMaker.
export function getReMakerMe(token) {
  return apiRequest("/remakers/me/", {
    method: "GET",
    token,
  });
}

// Get ReMaker profile.
export function getReMakerProfile(token) {
  return apiRequest("/remakers/profile/", {
    method: "GET",
    token,
  });
}

// Update ReMaker profile.
export function updateReMakerProfile(token, payload) {
  return apiRequest("/remakers/profile/", {
    method: "PATCH",
    token,
    body: payload,
  });
}

// Refresh access token.
export function refreshAccessToken(refreshToken) {
  return apiRequest("/auth/token/refresh/", {
    method: "POST",
    body: {
      refresh: refreshToken,
    },
  });
}

// Logout account.
export function logoutUser(accessToken, refreshToken) {
  return apiRequest("/auth/logout/", {
    method: "POST",
    token: accessToken,
    body: {
      refresh: refreshToken,
    },
  });
}

// Admin login.
export function adminLogin(payload) {
  return apiRequest("/admins/auth/login/", {
    method: "POST",
    body: payload,
  });
}
