import React, { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useNavTracker } from "./shared/backNav";
import "./styles/theme.css";
import { DelayedLoader } from "./shared/components/Spinner";
import RouteEffects from "./shared/components/RouteEffects";
import { page } from "./shared/lazyPage";

/* Shared layouts */
import UserLayout from "./user/components/UserLayout";
import ReMakerLayout from "./remaker/components/ReMakerLayout";
import AdminLayout from "./admin/components/AdminLayout";
import RequireAuth from "./shared/components/RequireAuth";

/* Public website and authentication */
const Auth = page("user", () => import("./user/pages/Auth/Auth"));
const Home = page("user", () => import("./user/pages/HomePages/Home"));
const About = page("user", () => import("./user/pages/HomePages/About"));
const FAQ = page("user", () => import("./user/pages/HomePages/FAQ"));
const Contact = page("user", () => import("./user/pages/HomePages/Contact"));
const HowItWorks = page(
  "user",
  () => import("./user/pages/HomePages/HowItWorks"),
);
const Privacy = page("user", () => import("./user/pages/HomePages/Privacy"));
const Terms = page("user", () => import("./user/pages/HomePages/Terms"));
const ReMakerDiscover = page(
  "user",
  () => import("./user/pages/HomePages/ReMakerDiscover"),
);
const UserBeforeMarketplace = page(
  "user",
  () => import("./user/pages/HomePages/UserBeforeMarketplace"),
);

/* User dashboard and marketplace */
const UserDashboard = page("user", () => import("./user/pages/UserDashboard"));
const UserCheckoutLegacy = page(
  "user",
  () => import("./user/pages/UserCheckout"),
);
const UserMarketplace = page(
  "user",
  () => import("./user/pages/BuyProducts/UserMarketplace"),
);
const UserProductDetails = page(
  "user",
  () => import("./user/pages/BuyProducts/UserProductDetails"),
);
const UserSellerProfile = page(
  "user",
  () => import("./user/pages/BuyProducts/UserSellerProfile"),
);
const UserArtistProfile = page(
  "user",
  () => import("./user/pages/BuyProducts/UserArtistProfile"),
);
const UserOrders = page(
  "user",
  () => import("./user/pages/BuyingOrders/UserOrders"),
);
const UserOrderDetails = page(
  "user",
  () => import("./user/pages/BuyingOrders/UserOrderDetails"),
);
const UserOrderTrack = page(
  "user",
  () => import("./user/pages/BuyingOrders/UserOrderTrack"),
);
const UserWishlist = page(
  "user",
  () => import("./user/pages/Wishlist/UserWishlist"),
);
const UserCart = page("user", () => import("./user/pages/Shop/UserCart"));
const UserShopCheckout = page(
  "user",
  () => import("./user/pages/Shop/UserCheckout"),
);
const UserOrderSuccess = page(
  "user",
  () => import("./user/pages/Shop/UserOrderSuccess"),
);

/* User donations */
const UserDonations = page(
  "user",
  () => import("./user/pages/Donations/UserDonations"),
);
const UserDonationNew = page(
  "user",
  () => import("./user/pages/Donations/UserDonationNew"),
);
const UserDonationSuccess = page(
  "user",
  () => import("./user/pages/Donations/UserDonationSuccess"),
);
const UserDonationHistory = page(
  "user",
  () => import("./user/pages/Donations/UserDonationHistory"),
);
const UserDonationDetails = page(
  "user",
  () => import("./user/pages/Donations/UserDonationDetails"),
);
const UserDonationPickup = page(
  "user",
  () => import("./user/pages/Donations/UserDonationPickup"),
);
const UserDonationCertificate = page(
  "user",
  () => import("./user/pages/Donations/UserDonationCertificate"),
);

/* User community, profile, rewards, help and selling */
const UserFollowing = page(
  "user",
  () => import("./user/pages/Following/UserFollowing"),
);
const UserRemakers = page(
  "user",
  () => import("./user/pages/Remakers/UserRemakers"),
);
const UserProfile = page(
  "user",
  () => import("./user/pages/UserProfile/UserProfile"),
);
const UserSettings = page(
  "user",
  () => import("./user/pages/Settings/UserSettings"),
);
const UserAddresses = page(
  "user",
  () => import("./user/pages/Addresses/UserAddresses"),
);
const UserBadges = page(
  "user",
  () => import("./user/pages/Rewards/UserBadges"),
);
const UserBadgeDetail = page(
  "user",
  () => import("./user/pages/Rewards/UserBadgeDetail"),
);
const UserOrbitPoints = page(
  "user",
  () => import("./user/pages/Rewards/UserOrbitPoints"),
);
const UserPointsHistory = page(
  "user",
  () => import("./user/pages/Rewards/UserPointsHistory"),
);
const UserWaysToEarn = page(
  "user",
  () => import("./user/pages/Rewards/UserWaysToEarn"),
);
const UserVouchers = page(
  "user",
  () => import("./user/pages/Rewards/UserVouchers"),
);
const UserRewardDetail = page(
  "user",
  () => import("./user/pages/Rewards/UserRewardDetail"),
);
const UserHelp = page("user", () => import("./user/pages/Help/UserHelp"));
const UserContactSupport = page(
  "user",
  () => import("./user/pages/Help/UserContactSupport"),
);
const UserTickets = page("user", () => import("./user/pages/Help/UserTickets"));
const UserTicketDetails = page(
  "user",
  () => import("./user/pages/Help/UserTicketDetails"),
);
const UserSell = page("user", () => import("./user/pages/Sell/UserSell"));
const UserSellForm = page(
  "user",
  () => import("./user/pages/Sell/UserSellForm"),
);
const UserListingDetails = page(
  "user",
  () => import("./user/pages/Sell/UserListingDetails"),
);
const UserSales = page("user", () => import("./user/pages/Sell/UserSales"));
const UserReviews = page(
  "user",
  () => import("./user/pages/Reviews/UserReviews"),
);
const UserSaleDetails = page(
  "user",
  () => import("./user/pages/Sell/UserSaleDetails"),
);
const UserWallet = page("user", () => import("./user/pages/Sell/UserWallet"));
const UserNotifications = page(
  "user",
  () => import("./user/pages/Notifications/UserNotifications"),
);
/* ReMaker public pages */
const ReMakerAuth = page(
  "remaker",
  () => import("./remaker/pages/Auth/ReMakerAuth"),
);
const ReMakersHome = page(
  "remaker",
  () => import("./remaker/pages/HomePages/ReMakersHome"),
);
const ReMakerAbout = page(
  "remaker",
  () => import("./remaker/pages/HomePages/About"),
);
const ReMakerFAQ = page(
  "remaker",
  () => import("./remaker/pages/HomePages/FAQ"),
);
const ReMakerHowItWorks = page(
  "remaker",
  () => import("./remaker/pages/HomePages/HowItWorks"),
);
const ReMakerContact = page(
  "remaker",
  () => import("./remaker/pages/HomePages/Contact"),
);
const ReMakerBeforeMarketplace = page(
  "remaker",
  () => import("./remaker/pages/HomePages/ReMakerBeforeMarketplace"),
);

/* ReMaker studio */
const ReMakerDashboard = page(
  "remaker",
  () => import("./remaker/pages/ReMakerDashboard"),
);
const ReMakerProfile = page(
  "remaker",
  () => import("./remaker/pages/ReMakerProfile"),
);
const ReMakerSales = page(
  "remaker",
  () => import("./remaker/pages/Sales/ReMakerSales"),
);
const ReMakerSaleDetails = page(
  "remaker",
  () => import("./remaker/pages/Sales/ReMakerSaleDetails"),
);
const ReMakerCustomers = page(
  "remaker",
  () => import("./remaker/pages/Customers/ReMakerCustomers"),
);
const ReMakerCustomerProfile = page(
  "remaker",
  () => import("./remaker/pages/Customers/ReMakerCustomerProfile"),
);
const ReMakerEarnings = page(
  "remaker",
  () => import("./remaker/pages/Earnings/ReMakerEarnings"),
);
const ReMakerTransactions = page(
  "remaker",
  () => import("./remaker/pages/Earnings/ReMakerTransactions"),
);
const ReMakerPayouts = page(
  "remaker",
  () => import("./remaker/pages/Earnings/ReMakerPayouts"),
);
const ReMakerAnalytics = page(
  "remaker",
  () => import("./remaker/pages/Analytics/ReMakerAnalytics"),
);
const ReMakerMyReviews = page(
  "remaker",
  () => import("./remaker/pages/MyReviews/ReMakerMyReviews"),
);
const ReMakerReviews = page(
  "remaker",
  () => import("./remaker/pages/Reviews/ReMakerReviews"),
);
const ReMakerFollowers = page(
  "remaker",
  () => import("./remaker/pages/Followers/ReMakerFollowers"),
);
const ReMakerNotifications = page(
  "remaker",
  () => import("./remaker/pages/Notifications/ReMakerNotifications"),
);
const ReMakerSettings = page(
  "remaker",
  () => import("./remaker/pages/Settings/ReMakerSettings"),
);
const ReMakerPortfolio = page(
  "remaker",
  () => import("./remaker/pages/Portfolio/ReMakerPortfolio"),
);
const ReMakerPortfolioAdd = page(
  "remaker",
  () => import("./remaker/pages/Portfolio/ReMakerPortfolioAdd"),
);
const ReMakerPortfolioEdit = page(
  "remaker",
  () => import("./remaker/pages/Portfolio/ReMakerPortfolioEdit"),
);
const ReMakerPortfolioView = page(
  "remaker",
  () => import("./remaker/pages/Portfolio/ReMakerPortfolioView"),
);
const ReMakerAddProduct = page(
  "remaker",
  () => import("./remaker/pages/Products/ReMakerAddProduct"),
);
const ReMakerEditProduct = page(
  "remaker",
  () => import("./remaker/pages/Products/ReMakerEditProduct"),
);
const ReMakerProducts = page(
  "remaker",
  () => import("./remaker/pages/Products/ReMakerProducts"),
);
const ReMakerHelp = page(
  "remaker",
  () => import("./remaker/pages/Help/ReMakerHelp"),
);
const ReMakerNewTicket = page(
  "remaker",
  () => import("./remaker/pages/Help/ReMakerNewTicket"),
);
const ReMakerTicket = page(
  "remaker",
  () => import("./remaker/pages/Help/ReMakerTicket"),
);
const ReMakerMessages = page(
  "remaker",
  () => import("./remaker/pages/Messages/ReMakerMessages"),
);
const ReMakerSaved = page(
  "remaker",
  () => import("./remaker/pages/Saved/ReMakerSaved"),
);
const ReMakerNotFound = page(
  "remaker",
  () => import("./remaker/pages/NotFound/ReMakerNotFound"),
);
const UnknownRoute = page(
  "remaker",
  () => import("./remaker/pages/NotFound/UnknownRoute"),
);

/* Admin public pages and dashboard */
const AdminNotFound = page(
  "admin",
  () => import("./admin/pages/States/AdminNotFound"),
);
const AdminStates = page(
  "admin",
  () => import("./admin/pages/States/AdminStates"),
);

const AdminLogin = page("admin", () => import("./admin/pages/Auth/AdminLogin"));
const AdminHome = page(
  "admin",
  () => import("./admin/pages/HomePages/AdminHome"),
);
const AdminAbout = page(
  "admin",
  () => import("./admin/pages/HomePages/AdminAbout"),
);
const AdminHowItWorks = page(
  "admin",
  () => import("./admin/pages/HomePages/AdminHowItWorks"),
);
const UserMessages = page(
  "user",
  () => import("./user/pages/Messages/UserMessages"),
);
const AdminDashboard = page("admin", () => import("./admin/pages/Dashboard"));

/* Admin management pages */
const AdminUsers = page(
  "admin",
  () => import("./admin/pages/Users/AdminUsers"),
);
const AdminUserProfile = page(
  "admin",
  () => import("./admin/pages/Users/AdminUserProfile"),
);
const AdminRemakers = page(
  "admin",
  () => import("./admin/pages/Remakers/AdminRemakers"),
);
const AdminRemakerProfile = page(
  "admin",
  () => import("./admin/pages/Remakers/AdminRemakerProfile"),
);
const AdminProducts = page(
  "admin",
  () => import("./admin/pages/Products/AdminProducts"),
);
const AdminProductDetails = page(
  "admin",
  () => import("./admin/pages/Products/AdminProductDetails"),
);
const AdminOrders = page(
  "admin",
  () => import("./admin/pages/Orders/AdminOrders"),
);
const AdminOrderDetails = page(
  "admin",
  () => import("./admin/pages/Orders/AdminOrderDetails"),
);
const AdminWarehouse = page(
  "admin",
  () => import("./admin/pages/Warehouse/AdminWarehouse"),
);
const AdminWarehouseItem = page(
  "admin",
  () => import("./admin/pages/Warehouse/AdminWarehouseItem"),
);
const AdminDonations = page(
  "admin",
  () => import("./admin/pages/Donations/AdminDonations"),
);
const AdminDonationDetails = page(
  "admin",
  () => import("./admin/pages/Donations/AdminDonationDetails"),
);
const AdminPickups = page(
  "admin",
  () => import("./admin/pages/Pickups/AdminPickups"),
);
const AdminPickupDetails = page(
  "admin",
  () => import("./admin/pages/Pickups/AdminPickupDetails"),
);
const AdminPickupTeams = page(
  "admin",
  () => import("./admin/pages/Pickups/AdminPickupTeams"),
);
const AdminComplaints = page(
  "admin",
  () => import("./admin/pages/Complaints/AdminComplaints"),
);
const AdminSupport = page(
  "admin",
  () => import("./admin/pages/Support/AdminSupport"),
);
const AdminComplaintDetails = page(
  "admin",
  () => import("./admin/pages/Complaints/AdminComplaintDetails"),
);
const AdminRewards = page(
  "admin",
  () => import("./admin/pages/Rewards/AdminRewards"),
);
const AdminReports = page(
  "admin",
  () => import("./admin/pages/Reports/AdminReports"),
);
const AdminSettings = page(
  "admin",
  () => import("./admin/pages/Settings/AdminSettings"),
);
const AdminProfile = page(
  "admin",
  () => import("./admin/pages/Profile/AdminProfile"),
);
const AdminTeam = page("admin", () => import("./admin/pages/Team/AdminTeam"));
const AdminEarnings = page(
  "admin",
  () => import("./admin/pages/Earnings/AdminEarnings"),
);
const AdminNotifications = page(
  "admin",
  () => import("./admin/pages/Notifications/AdminNotifications"),
);
const AdminContent = page(
  "admin",
  () => import("./admin/pages/Content/AdminContent"),
);
const AdminHelp = page("admin", () => import("./admin/pages/Help/AdminHelp"));
const AdminSell = page("admin", () => import("./admin/pages/Sell/AdminSell"));
const AdminSellForm = page(
  "admin",
  () => import("./admin/pages/Sell/AdminSellForm"),
);
const AdminSellListing = page(
  "admin",
  () => import("./admin/pages/Sell/AdminSellListing"),
);
const AdminSales = page("admin", () => import("./admin/pages/Sell/AdminSales"));

function RouteFallback() {
  const { pathname } = useLocation();

  if (pathname === "/admin" || pathname === "/admin/") {
    return <Navigate to="/admin-dashboard" replace />;
  }

  if (pathname.startsWith("/admin")) {
    return (
      <AdminLayout>
        <AdminNotFound />
      </AdminLayout>
    );
  }

  return <Navigate to="/" replace />;
}

export default function App() {
  useNavTracker();
  return (
    <Suspense fallback={<DelayedLoader minHeight={360} />}>
      <RouteEffects />
      <Routes>
        {/* Public website */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        {/* Compatibility aliases used by older links */}
        <Route path="/UserPrivacy" element={<Privacy />} />
        <Route path="/UserTerms" element={<Terms />} />
        <Route
          path="/user-before-marketplace"
          element={<UserBeforeMarketplace />}
        />
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Auth />} />
        <Route
          path="/discover-marketplace"
          element={<UserBeforeMarketplace />}
        />
        <Route path="/marketplace" element={<UserBeforeMarketplace />} />
        <Route path="/discover-remakers" element={<ReMakerDiscover />} />

        {/* User app */}
        <Route element={<RequireAuth role="user" />}>
          <Route element={<UserLayout />}>
            <Route path="/user-dashboard" element={<UserDashboard />} />
            <Route path="/user-marketplace" element={<UserMarketplace />} />
            <Route
              path="/user-marketplace/product/:productId"
              element={<UserProductDetails />}
            />
            <Route
              path="/user-marketplace/seller/:sellerId"
              element={<UserSellerProfile />}
            />
            <Route
              path="/user-seller-profile/:sellerId"
              element={<UserSellerProfile />}
            />
            <Route
              path="/user-marketplace/remaker/:artistId"
              element={<UserArtistProfile />}
            />
            <Route
              path="/user-artist-profile/:artistId"
              element={<UserArtistProfile />}
            />

            <Route path="/user-orders" element={<UserOrders />} />
            <Route
              path="/user-orders/:orderId"
              element={<UserOrderDetails />}
            />
            <Route
              path="/user-orders/:orderId/track"
              element={<UserOrderTrack />}
            />
            <Route path="/user-wishlist" element={<UserWishlist />} />
            <Route path="/user-cart" element={<UserCart />} />
            <Route path="/user-checkout" element={<UserShopCheckout />} />
            <Route
              path="/user-checkout/success/:ids"
              element={<UserOrderSuccess />}
            />
            {/* Older checkout page retained for any legacy links; current shop flow uses /user-checkout. */}
            <Route
              path="/user-checkout-legacy"
              element={<UserCheckoutLegacy />}
            />

            <Route path="/user-donations" element={<UserDonations />} />
            <Route path="/user-donations/new" element={<UserDonationNew />} />
            <Route
              path="/user-donations/history"
              element={<UserDonationHistory />}
            />
            <Route
              path="/user-donations/success/:donationId"
              element={<UserDonationSuccess />}
            />
            <Route
              path="/user-donations/:donationId/pickup"
              element={<UserDonationPickup />}
            />
            <Route
              path="/user-donations/:donationId/certificate"
              element={<UserDonationCertificate />}
            />
            <Route
              path="/user-donations/:donationId"
              element={<UserDonationDetails />}
            />
            <Route path="/user-following" element={<UserFollowing />} />
            <Route path="/user-remakers" element={<UserRemakers />} />

            <Route path="/user-profile" element={<UserProfile />} />
            <Route path="/user-settings" element={<UserSettings />} />
            <Route path="/user-addresses" element={<UserAddresses />} />
            <Route path="/user-orbit-points" element={<UserOrbitPoints />} />
            <Route
              path="/user-orbit-points/history"
              element={<UserPointsHistory />}
            />
            <Route
              path="/user-orbit-points/earn"
              element={<UserWaysToEarn />}
            />
            <Route
              path="/user-orbit-points/vouchers"
              element={<UserVouchers />}
            />
            <Route
              path="/user-orbit-points/rewards/:voucherId"
              element={<UserRewardDetail />}
            />
            <Route path="/user-badges" element={<UserBadges />} />
            <Route path="/user-badges/:badgeId" element={<UserBadgeDetail />} />

            <Route path="/user-notifications" element={<UserNotifications />} />
            <Route path="/user-messages" element={<UserMessages />} />
            <Route path="/user-messages/:id" element={<UserMessages />} />
            <Route path="/user-sell" element={<UserSell />} />
            <Route path="/user-sell/new" element={<UserSellForm />} />
            <Route path="/user-reviews" element={<UserReviews />} />
            <Route path="/user-sell/sales" element={<UserSales />} />
            <Route path="/user-wallet" element={<UserWallet />} />
            <Route
              path="/user-sell/sales/:orderId"
              element={<UserSaleDetails />}
            />
            <Route
              path="/user-sell/:listingId/edit"
              element={<UserSellForm />}
            />
            <Route
              path="/user-sell/:listingId"
              element={<UserListingDetails />}
            />

            <Route path="/user-help" element={<UserHelp />} />
            <Route path="/user-help/contact" element={<UserContactSupport />} />
            <Route path="/user-help/tickets" element={<UserTickets />} />
            <Route
              path="/user-help/tickets/:ticketId"
              element={<UserTicketDetails />}
            />
          </Route>
        </Route>

        {/* ReMaker public site */}
        <Route path="/remakers" element={<ReMakersHome />} />
        <Route path="/remakers-home" element={<ReMakersHome />} />
        <Route path="/remakers-auth" element={<ReMakerAuth />} />
        <Route path="/remakers/join" element={<ReMakerAuth />} />
        <Route
          path="/remakers/studio"
          element={<Navigate to="/remaker-dashboard" replace />}
        />
        <Route path="/remakers-about" element={<ReMakerAbout />} />
        <Route path="/remakers-faq" element={<ReMakerFAQ />} />
        <Route path="/remakers-how-it-works" element={<ReMakerHowItWorks />} />
        <Route path="/remakers-contact" element={<ReMakerContact />} />
        <Route
          path="/remakers-before-marketplace"
          element={<ReMakerBeforeMarketplace />}
        />

        {/* ReMaker studio */}
        <Route element={<RequireAuth role="remaker" />}>
          <Route element={<ReMakerLayout />}>
            <Route path="/remaker-dashboard" element={<ReMakerDashboard />} />
            <Route path="/remaker-profile" element={<ReMakerProfile />} />
            {/* ReMakers buy with the same live pages as members (paths are mapped by shared/portalRouter) */}
            <Route path="/remaker-marketplace" element={<UserMarketplace />} />
            <Route
              path="/remaker-marketplace/product/:productId"
              element={<UserProductDetails />}
            />
            <Route
              path="/remaker-marketplace/seller/:sellerId"
              element={<UserSellerProfile />}
            />
            <Route
              path="/remaker-marketplace/remaker/:artistId"
              element={<UserArtistProfile />}
            />
            <Route path="/remaker-cart" element={<UserCart />} />
            <Route path="/remaker-checkout" element={<UserShopCheckout />} />
            <Route
              path="/remaker-checkout/success/:ids"
              element={<UserOrderSuccess />}
            />
            <Route path="/remaker-orders" element={<UserOrders />} />
            <Route
              path="/remaker-orders/:orderId"
              element={<UserOrderDetails />}
            />
            <Route
              path="/remaker-orders/:orderId/track"
              element={<UserOrderTrack />}
            />

            <Route path="/remaker-sales" element={<ReMakerSales />} />
            <Route
              path="/remaker-sales/:orderId"
              element={<ReMakerSaleDetails />}
            />
            <Route path="/remaker-customers" element={<ReMakerCustomers />} />
            <Route
              path="/remaker-customers/:customerId"
              element={<ReMakerCustomerProfile />}
            />

            <Route path="/remaker-earnings" element={<ReMakerEarnings />} />
            <Route
              path="/remaker-earnings/transactions"
              element={<ReMakerTransactions />}
            />
            <Route
              path="/remaker-earnings/payouts"
              element={<ReMakerPayouts />}
            />
            <Route path="/remaker-analytics" element={<ReMakerAnalytics />} />
            <Route path="/remaker-reviews" element={<ReMakerReviews />} />
            <Route path="/remaker-my-reviews" element={<ReMakerMyReviews />} />
            <Route path="/remaker-followers" element={<ReMakerFollowers />} />
            <Route
              path="/remaker-notifications"
              element={<ReMakerNotifications />}
            />
            <Route path="/remaker-settings" element={<ReMakerSettings />} />
            <Route path="/remaker-addresses" element={<UserAddresses />} />

            <Route path="/remaker-portfolio" element={<ReMakerPortfolio />} />
            <Route
              path="/remaker-portfolio/new"
              element={<ReMakerPortfolioAdd />}
            />
            <Route
              path="/remaker-portfolio/:id/edit"
              element={<ReMakerPortfolioEdit />}
            />
            <Route
              path="/remaker-portfolio/:id"
              element={<ReMakerPortfolioView />}
            />

            <Route path="/remaker-products" element={<ReMakerProducts />} />
            <Route
              path="/remaker-products/new"
              element={<ReMakerAddProduct />}
            />
            <Route
              path="/remaker-products/marketplace"
              element={<Navigate to="/remaker-marketplace" replace />}
            />
            <Route
              path="/remaker-products/:id/edit"
              element={<ReMakerEditProduct />}
            />

            <Route path="/remaker-help" element={<ReMakerHelp />} />
            <Route path="/remaker-help/new" element={<ReMakerNewTicket />} />
            <Route
              path="/remaker-help/tickets/:ticketId"
              element={<ReMakerTicket />}
            />
            <Route path="/remaker-messages" element={<ReMakerMessages />} />
            <Route path="/remaker-messages/:id" element={<ReMakerMessages />} />
            <Route path="/remaker-saved" element={<ReMakerSaved />} />
            <Route path="/remaker-not-found" element={<ReMakerNotFound />} />
            <Route path="/remaker-unknown-route" element={<UnknownRoute />} />
          </Route>
        </Route>

        {/* Admin public pages */}
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin-home" element={<AdminHome />} />
        <Route path="/admin-about" element={<AdminAbout />} />
        <Route path="/admin-how-it-works" element={<AdminHowItWorks />} />

        {/* Admin panel */}
        <Route element={<RequireAuth role="admin" />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin-users" element={<AdminUsers />} />
            <Route path="/admin-users/:userId" element={<AdminUserProfile />} />
            <Route path="/admin-remakers" element={<AdminRemakers />} />
            <Route
              path="/admin-remakers/:remakerId"
              element={<AdminRemakerProfile />}
            />
            <Route path="/admin-products" element={<AdminProducts />} />
            <Route
              path="/admin-products/:productId"
              element={<AdminProductDetails />}
            />
            <Route path="/admin-orders" element={<AdminOrders />} />
            <Route
              path="/admin-orders/:orderId"
              element={<AdminOrderDetails />}
            />
            <Route path="/admin-warehouse" element={<AdminWarehouse />} />
            <Route
              path="/admin-warehouse/:inventoryId"
              element={<AdminWarehouseItem />}
            />
            <Route path="/admin-donations" element={<AdminDonations />} />
            <Route
              path="/admin-donations/:donationId"
              element={<AdminDonationDetails />}
            />
            <Route path="/admin-pickups" element={<AdminPickups />} />
            <Route path="/admin-pickups/teams" element={<AdminPickupTeams />} />
            <Route
              path="/admin-pickups/:pickupId"
              element={<AdminPickupDetails />}
            />
            <Route path="/admin-complaints" element={<AdminComplaints />} />
            <Route path="/admin-support" element={<AdminSupport />} />
            <Route
              path="/admin-complaints/:complaintId"
              element={<AdminComplaintDetails />}
            />
            <Route path="/admin-rewards" element={<AdminRewards />} />
            <Route path="/admin-reports" element={<AdminReports />} />
            <Route path="/admin-settings" element={<AdminSettings />} />
            <Route path="/admin-addresses" element={<UserAddresses />} />
            <Route path="/admin-team" element={<AdminTeam />} />
            <Route path="/admin-earnings" element={<AdminEarnings />} />
            <Route
              path="/admin-notifications"
              element={<AdminNotifications />}
            />
            <Route path="/admin-content" element={<AdminContent />} />
            <Route path="/admin-help" element={<AdminHelp />} />
            <Route path="/admin-states" element={<AdminStates />} />

            {/* admins buy with the same live pages as members (paths are mapped by shared/portalRouter) */}
            <Route path="/admin-shop" element={<UserMarketplace />} />
            <Route
              path="/admin-shop/product/:productId"
              element={<UserProductDetails />}
            />
            <Route
              path="/admin-shop/seller/:sellerId"
              element={<UserSellerProfile />}
            />
            <Route
              path="/admin-shop/remaker/:artistId"
              element={<UserArtistProfile />}
            />
            <Route path="/admin-shop/cart" element={<UserCart />} />
            <Route path="/admin-shop/checkout" element={<UserShopCheckout />} />
            <Route
              path="/admin-shop/checkout/success/:ids"
              element={<UserOrderSuccess />}
            />
            <Route path="/admin-shop/orders" element={<UserOrders />} />
            <Route
              path="/admin-shop/orders/:orderId"
              element={<UserOrderDetails />}
            />
            <Route
              path="/admin-shop/orders/:orderId/track"
              element={<UserOrderTrack />}
            />

            <Route path="/admin-sell" element={<AdminSell />} />
            <Route path="/admin-sell/new" element={<AdminSellForm />} />
            <Route path="/admin-sell/edit/:id" element={<AdminSellForm />} />
            <Route
              path="/admin-sell/listing/:id"
              element={<AdminSellListing />}
            />
            <Route path="/admin-sell/sales" element={<AdminSales />} />
            <Route
              path="/admin-sell/sales/:orderId"
              element={<AdminOrderDetails />}
            />
            {/* Keep older admin navigation destinations working. */}
            <Route path="/admin-profile" element={<AdminProfile />} />
          </Route>
        </Route>

        {/* Admin unknown routes stay inside the admin shell; other unknown routes go home. */}
        <Route path="*" element={<RouteFallback />} />
      </Routes>
    </Suspense>
  );
}
