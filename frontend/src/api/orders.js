import { apiRequest } from "./api";

/* Orders, addresses, checkout and payment. The server prices everything;
   the browser only sends ids and quantities. */
const post = (path, body = {}) => apiRequest(path, { method: "POST", body });

export const addressApi = {
  list: () => apiRequest("/orders/addresses/").then((r) => r.data.addresses),
  create: (body) =>
    post("/orders/addresses/", body).then((r) => r.data.address),
  update: (id, body) =>
    apiRequest(`/orders/addresses/${id}/`, { method: "PATCH", body }).then(
      (r) => r.data.address,
    ),
  remove: (id) => apiRequest(`/orders/addresses/${id}/`, { method: "DELETE" }),
  makeDefault: (id) =>
    post(`/orders/addresses/${id}/default/`).then((r) => r.data.address),
};

export const checkoutApi = {
  quote: (items, voucherCode) =>
    post(
      "/orders/quote/",
      voucherCode ? { items, voucher_code: voucherCode } : { items },
    ).then((r) => r.data),
  /* `requestId` makes a double click or a retry safe: the server returns the same checkout. */
  place: (body, requestId) =>
    apiRequest("/orders/checkout/", {
      method: "POST",
      body,
      headers: requestId ? { "Idempotency-Key": requestId } : {},
    }).then((r) => r.data),
  config: () =>
    apiRequest("/payments/config/", { auth: false }).then((r) => r.data),
  verify: (payload) => post("/payments/verify/", payload).then((r) => r.data),
  cancelPayment: (id) => post(`/payments/${id}/cancel/`).then((r) => r.data),
};

export const buyerOrdersApi = {
  list: (params = "") => apiRequest(`/orders/me/${params}`).then((r) => r.data),
  get: (id) => apiRequest(`/orders/me/${id}/`).then((r) => r.data.order),
  cancel: (id, reason) =>
    post(`/orders/me/${id}/cancel/`, { reason }).then((r) => r.data.order),
  /* returns: `form` is a FormData with reason, details and photos */
  requestReturn: (id, form) =>
    apiRequest(`/orders/me/${id}/return/`, { method: "POST", body: form }).then(
      (r) => r.data.order,
    ),
  returnAction: (id, action) =>
    post(`/orders/me/${id}/return/${action}/`).then((r) => r.data.order),
};

/* Couriers and the reasons used by returns and failed deliveries. Rarely changes: fetched once. */
let optionsPromise;
export const orderOptionsApi = {
  get: () => {
    if (!optionsPromise) {
      optionsPromise = apiRequest("/orders/options/")
        .then((r) => r.data)
        .catch((e) => {
          optionsPromise = null;
          throw e;
        });
    }
    return optionsPromise;
  },
};

/* Admin: refunds that went wrong or have to be sent by hand */
export const adminRefundApi = {
  list: (params = "") =>
    apiRequest(`/payments/admin/refunds/${params}`).then((r) => r.data),
  retry: (id) =>
    post(`/payments/admin/refunds/${id}/retry/`).then((r) => r.data),
  markPaid: (id, reference) =>
    post(`/payments/admin/refunds/${id}/mark-paid/`, { reference }).then(
      (r) => r.data.refund,
    ),
};

/* Seller side. `base` is "/orders/sales" (member or ReMaker) or "/orders/admin" (admin). */
export function sellerOrdersApi(base) {
  return {
    list: (params = "") => apiRequest(`${base}/${params}`).then((r) => r.data),
    get: (id) => apiRequest(`${base}/${id}/`).then((r) => r.data.order),
    act: (id, action, body = {}) =>
      post(`${base}/${id}/${action}/`, body).then((r) => r.data.order),
  };
}
export const salesApi = sellerOrdersApi("/orders/sales");
export const adminOrdersApi = sellerOrdersApi("/orders/admin");

/* Razorpay's Checkout.js, loaded once, only when someone pays online. */
let scriptPromise;
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      s.onload = () => resolve(window.Razorpay);
      s.onerror = () => {
        scriptPromise = null;
        reject(
          new Error(
            "Could not load the payment window. Check your connection and try again.",
          ),
        );
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

/* Opens the Razorpay window for a payment the server created. Resolves with the verified
   server result, or rejects with { dismissed: true } if the buyer closed the window. */
export async function payOnline(payment, { name, email, phone } = {}) {
  const Razorpay = await loadRazorpay();
  return new Promise((resolve, reject) => {
    const rz = new Razorpay({
      key: payment.key_id,
      order_id: payment.razorpay_order_id,
      amount: payment.amount * 100,
      currency: "INR",
      name: "ReOrbit",
      description: "Order payment",
      prefill: { name, email, contact: phone },
      theme: { color: "#2a4d3a" },
      handler: (resp) => {
        checkoutApi
          .verify({
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          })
          .then(resolve, reject);
      },
      modal: {
        ondismiss: () =>
          reject(
            Object.assign(new Error("Payment cancelled."), { dismissed: true }),
          ),
      },
    });
    /* A failed attempt stays inside Razorpay's own window, where the buyer can retry or pick another
       method. We only react to success (handler) or the window being closed (ondismiss). */
    rz.open();
  });
}
