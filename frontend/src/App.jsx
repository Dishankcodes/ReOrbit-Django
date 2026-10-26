import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./styles/theme.css";

/* Shared layouts */
import UserLayout from "./user/components/UserLayout";
import ReMakerLayout from "./remaker/components/ReMakerLayout";
import AdminLayout from "./admin/components/AdminLayout";

/* Public website and authentication */
import Auth from "./user/pages/Auth/Auth";
import Home from "./user/pages/HomePages/Home";
import About from "./user/pages/HomePages/About";
import FAQ from "./user/pages/HomePages/FAQ";
import Contact from "./user/pages/HomePages/Contact";
import HowItWorks from "./user/pages/HomePages/HowItWorks";
import Privacy from "./user/pages/HomePages/Privacy";
import Terms from "./user/pages/HomePages/Terms";
import ReMakerDiscover from "./user/pages/HomePages/ReMakerDiscover";
import UserBeforeMarketplace from "./user/pages/HomePages/UserBeforeMarketplace";

/* User dashboard and marketplace */
import UserDashboard from "./user/pages/UserDashboard";
import UserCheckoutLegacy from "./user/pages/UserCheckout";
import UserMarketplace from "./user/pages/BuyProducts/UserMarketplace";
import UserProductDetails from "./user/pages/BuyProducts/UserProductDetails";
import UserSellerProfile from "./user/pages/BuyProducts/UserSellerProfile";
import UserArtistProfile from "./user/pages/BuyProducts/UserArtistProfile";
import UserOrders from "./user/pages/BuyingOrders/UserOrders";
import UserOrderDetails from "./user/pages/BuyingOrders/UserOrderDetails";
import UserOrderTrack from "./user/pages/BuyingOrders/UserOrderTrack";
import UserWishlist from "./user/pages/Wishlist/UserWishlist";
import UserCart from "./user/pages/Shop/UserCart";
import UserShopCheckout from "./user/pages/Shop/UserCheckout";
import UserOrderSuccess from "./user/pages/Shop/UserOrderSuccess";

/* User donations */
import UserDonations from "./user/pages/Donations/UserDonations";
import UserDonationNew from "./user/pages/Donations/UserDonationNew";
import UserDonationSuccess from "./user/pages/Donations/UserDonationSuccess";
import UserDonationHistory from "./user/pages/Donations/UserDonationHistory";
import UserDonationDetails from "./user/pages/Donations/UserDonationDetails";
import UserDonationPickup from "./user/pages/Donations/UserDonationPickup";
import UserDonationCertificate from "./user/pages/Donations/UserDonationCertificate";

/* User community, profile, rewards, help and selling */
import UserFollowing from "./user/pages/Following/UserFollowing";
import UserRemakers from "./user/pages/Remakers/UserRemakers";
import UserProfile from "./user/pages/UserProfile/UserProfile";
import UserSettings from "./user/pages/Settings/UserSettings";
import UserBadges from "./user/pages/Rewards/UserBadges";
import UserBadgeDetail from "./user/pages/Rewards/UserBadgeDetail";
import UserOrbitPoints from "./user/pages/Rewards/UserOrbitPoints";
import UserPointsHistory from "./user/pages/Rewards/UserPointsHistory";
import UserWaysToEarn from "./user/pages/Rewards/UserWaysToEarn";
import UserVouchers from "./user/pages/Rewards/UserVouchers";
import UserRewardDetail from "./user/pages/Rewards/UserRewardDetail";
import UserHelp from "./user/pages/Help/UserHelp";
import UserContactSupport from "./user/pages/Help/UserContactSupport";
import UserTickets from "./user/pages/Help/UserTickets";
import UserTicketDetails from "./user/pages/Help/UserTicketDetails";
import UserSell from "./user/pages/Sell/UserSell";
import UserSellForm from "./user/pages/Sell/UserSellForm";
import UserListingDetails from "./user/pages/Sell/UserListingDetails";
import UserSales from "./user/pages/Sell/UserSales";
import UserSaleDetails from "./user/pages/Sell/UserSaleDetails";
import UserNotifications from "./user/pages/Notifications/UserNotifications";
/* ReMaker public pages */
import ReMakerAuth from "./remaker/pages/Auth/ReMakerAuth";
import ReMakersHome from "./remaker/pages/HomePages/ReMakersHome";
import ReMakerAbout from "./remaker/pages/HomePages/About";
import ReMakerFAQ from "./remaker/pages/HomePages/FAQ";
import ReMakerHowItWorks from "./remaker/pages/HomePages/HowItWorks";
import ReMakerContact from "./remaker/pages/HomePages/Contact";
import ReMakerBeforeMarketplace from "./remaker/pages/HomePages/ReMakerBeforeMarketplace";

/* ReMaker studio */
import ReMakerDashboard from "./remaker/pages/ReMakerDashboard";
import ReMakerProfile from "./remaker/pages/ReMakerProfile";
import ReMakerMarketplace from "./remaker/pages/Marketplace/ReMakerMarketplace";
import ReMakerProductDetails from "./remaker/pages/Marketplace/ReMakerProductDetails";
import ReMakerSellerProfile from "./remaker/pages/Marketplace/ReMakerSellerProfile";
import ReMakerOrders from "./remaker/pages/Orders/ReMakerOrders";
import ReMakerOrderDetails from "./remaker/pages/Orders/ReMakerOrderDetails";
import ReMakerOrderTrack from "./remaker/pages/Orders/ReMakerOrderTrack";
import ReMakerOrderReport from "./remaker/pages/Orders/ReMakerOrderReport";
import ReMakerSales from "./remaker/pages/Sales/ReMakerSales";
import ReMakerSaleDetails from "./remaker/pages/Sales/ReMakerSaleDetails";
import ReMakerCustomers from "./remaker/pages/Customers/ReMakerCustomers";
import ReMakerCustomerProfile from "./remaker/pages/Customers/ReMakerCustomerProfile";
import ReMakerEarnings from "./remaker/pages/Earnings/ReMakerEarnings";
import ReMakerTransactions from "./remaker/pages/Earnings/ReMakerTransactions";
import ReMakerPayouts from "./remaker/pages/Earnings/ReMakerPayouts";
import ReMakerAnalytics from "./remaker/pages/Analytics/ReMakerAnalytics";
import ReMakerReviews from "./remaker/pages/Reviews/ReMakerReviews";
import ReMakerFollowers from "./remaker/pages/Followers/ReMakerFollowers";
import ReMakerNotifications from "./remaker/pages/Notifications/ReMakerNotifications";
import ReMakerSettings from "./remaker/pages/Settings/ReMakerSettings";
import ReMakerPortfolio from "./remaker/pages/Portfolio/ReMakerPortfolio";
import ReMakerPortfolioAdd from "./remaker/pages/Portfolio/ReMakerPortfolioAdd";
import ReMakerPortfolioEdit from "./remaker/pages/Portfolio/ReMakerPortfolioEdit";
import ReMakerPortfolioView from "./remaker/pages/Portfolio/ReMakerPortfolioView";
import ReMakerAddProduct from "./remaker/pages/Products/ReMakerAddProduct";
import ReMakerEditProduct from "./remaker/pages/Products/ReMakerEditProduct";
import ReMakerProducts from "./remaker/pages/Products/ReMakerProducts";
import ReMakerProductsMarketplace from "./remaker/pages/Products/ReMakerMarketplace";
import ReMakerHelp from "./remaker/pages/Help/ReMakerHelp";
import ReMakerNewTicket from "./remaker/pages/Help/ReMakerNewTicket";
import ReMakerTicket from "./remaker/pages/Help/ReMakerTicket";
import ReMakerJobs from "./remaker/pages/Jobs/ReMakerJobs";
import ReMakerJobDetails from "./remaker/pages/Jobs/ReMakerJobDetails";
import ReMakerMessages from "./remaker/pages/Messages/ReMakerMessages";
import ReMakerSaved from "./remaker/pages/Saved/ReMakerSaved";
import ReMakerNotFound from "./remaker/pages/NotFound/ReMakerNotFound";
import UnknownRoute from "./remaker/pages/NotFound/UnknownRoute";

/* Admin public pages and dashboard */
import AdminNotFound from "./admin/pages/States/AdminNotFound";
import AdminStates from "./admin/pages/States/AdminStates";

import AdminLogin from "./admin/pages/Auth/AdminLogin";
import AdminHome from "./admin/pages/HomePages/AdminHome";
import AdminAbout from "./admin/pages/HomePages/AdminAbout";
import AdminHowItWorks from "./admin/pages/HomePages/AdminHowItWorks";
import AdminDashboard from "./admin/pages/Dashboard";

/* Admin management pages */
import AdminUsers from "./admin/pages/Users/AdminUsers";
import AdminUserProfile from "./admin/pages/Users/AdminUserProfile";
import AdminRemakers from "./admin/pages/Remakers/AdminRemakers";
import AdminRemakerProfile from "./admin/pages/Remakers/AdminRemakerProfile";
import AdminProducts from "./admin/pages/Products/AdminProducts";
import AdminProductDetails from "./admin/pages/Products/AdminProductDetails";
import AdminOrders from "./admin/pages/Orders/AdminOrders";
import AdminOrderDetails from "./admin/pages/Orders/AdminOrderDetails";
import AdminWarehouse from "./admin/pages/Warehouse/AdminWarehouse";
import AdminWarehouseItem from "./admin/pages/Warehouse/AdminWarehouseItem";
import AdminDonations from "./admin/pages/Donations/AdminDonations";
import AdminDonationDetails from "./admin/pages/Donations/AdminDonationDetails";
import AdminPickups from "./admin/pages/Pickups/AdminPickups";
import AdminPickupDetails from "./admin/pages/Pickups/AdminPickupDetails";
import AdminPickupTeams from "./admin/pages/Pickups/AdminPickupTeams";
import AdminComplaints from "./admin/pages/Complaints/AdminComplaints";
import AdminComplaintDetails from "./admin/pages/Complaints/AdminComplaintDetails";
import AdminRewards from "./admin/pages/Rewards/AdminRewards";
import AdminReports from "./admin/pages/Reports/AdminReports";
import AdminSettings from "./admin/pages/Settings/AdminSettings";
import AdminTeam from "./admin/pages/Team/AdminTeam";
import AdminEarnings from "./admin/pages/Earnings/AdminEarnings";
import AdminNotifications from "./admin/pages/Notifications/AdminNotifications";
import AdminContent from "./admin/pages/Content/AdminContent";
import AdminHelp from "./admin/pages/Help/AdminHelp";
import AdminShop from "./admin/pages/Shop/AdminShop";
import AdminShopProduct from "./admin/pages/Shop/AdminShopProduct";
import AdminShopSeller from "./admin/pages/Shop/AdminShopSeller";
import AdminShopCart from "./admin/pages/Shop/AdminShopCart";
import AdminShopCheckout from "./admin/pages/Shop/AdminShopCheckout";
import AdminShopSuccess from "./admin/pages/Shop/AdminShopSuccess";
import AdminShopOrders from "./admin/pages/Shop/AdminShopOrders";
import AdminShopOrderDetails from "./admin/pages/Shop/AdminShopOrderDetails";
import AdminSell from "./admin/pages/Sell/AdminSell";
import AdminSellForm from "./admin/pages/Sell/AdminSellForm";
import AdminSellListing from "./admin/pages/Sell/AdminSellListing";
import AdminSales from "./admin/pages/Sell/AdminSales";
import AdminSaleDetails from "./admin/pages/Sell/AdminSaleDetails";

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
  return (
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
      <Route path="/discover-marketplace" element={<UserBeforeMarketplace />} />
      <Route path="/marketplace" element={<UserBeforeMarketplace />} />
      <Route path="/discover-remakers" element={<ReMakerDiscover />} />

      {/* User app */}
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
        <Route path="/user-orders/:orderId" element={<UserOrderDetails />} />
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
        <Route path="/user-checkout-legacy" element={<UserCheckoutLegacy />} />

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
        <Route path="/user-orbit-points" element={<UserOrbitPoints />} />
        <Route
          path="/user-orbit-points/history"
          element={<UserPointsHistory />}
        />
        <Route path="/user-orbit-points/earn" element={<UserWaysToEarn />} />
        <Route path="/user-orbit-points/vouchers" element={<UserVouchers />} />
        <Route
          path="/user-orbit-points/rewards/:voucherId"
          element={<UserRewardDetail />}
        />
        <Route path="/user-badges" element={<UserBadges />} />
        <Route path="/user-badges/:badgeId" element={<UserBadgeDetail />} />

        <Route path="/user-notifications" element={<UserNotifications />} />
        <Route path="/user-sell" element={<UserSell />} />
        <Route path="/user-sell/new" element={<UserSellForm />} />
        <Route path="/user-sell/sales" element={<UserSales />} />
        <Route path="/user-sell/sales/:saleId" element={<UserSaleDetails />} />
        <Route path="/user-sell/:listingId/edit" element={<UserSellForm />} />
        <Route path="/user-sell/:listingId" element={<UserListingDetails />} />

        <Route path="/user-help" element={<UserHelp />} />
        <Route path="/user-help/contact" element={<UserContactSupport />} />
        <Route path="/user-help/tickets" element={<UserTickets />} />
        <Route
          path="/user-help/tickets/:ticketId"
          element={<UserTicketDetails />}
        />
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
      <Route element={<ReMakerLayout />}>
        <Route path="/remaker-dashboard" element={<ReMakerDashboard />} />
        <Route path="/remaker-profile" element={<ReMakerProfile />} />
        <Route path="/remaker-marketplace" element={<ReMakerMarketplace />} />
        <Route
          path="/remaker-marketplace/product/:id"
          element={<ReMakerProductDetails />}
        />
        <Route
          path="/remaker-marketplace/seller/:id"
          element={<ReMakerSellerProfile />}
        />

        <Route path="/remaker-orders" element={<ReMakerOrders />} />
        <Route
          path="/remaker-orders/:orderId"
          element={<ReMakerOrderDetails />}
        />
        <Route
          path="/remaker-orders/:orderId/track"
          element={<ReMakerOrderTrack />}
        />
        <Route
          path="/remaker-orders/:orderId/report"
          element={<ReMakerOrderReport />}
        />

        <Route path="/remaker-sales" element={<ReMakerSales />} />
        <Route path="/remaker-sales/:saleId" element={<ReMakerSaleDetails />} />
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
        <Route path="/remaker-earnings/payouts" element={<ReMakerPayouts />} />
        <Route path="/remaker-analytics" element={<ReMakerAnalytics />} />
        <Route path="/remaker-reviews" element={<ReMakerReviews />} />
        <Route path="/remaker-followers" element={<ReMakerFollowers />} />
        <Route
          path="/remaker-notifications"
          element={<ReMakerNotifications />}
        />
        <Route path="/remaker-settings" element={<ReMakerSettings />} />

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
        <Route path="/remaker-products/new" element={<ReMakerAddProduct />} />
        <Route
          path="/remaker-products/marketplace"
          element={<ReMakerProductsMarketplace />}
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
        <Route path="/remaker-jobs" element={<ReMakerJobs />} />
        <Route path="/remaker-jobs/:jobId" element={<ReMakerJobDetails />} />
        <Route path="/remaker-messages" element={<ReMakerMessages />} />
        <Route path="/remaker-saved" element={<ReMakerSaved />} />
        <Route path="/remaker-not-found" element={<ReMakerNotFound />} />
        <Route path="/remaker-unknown-route" element={<UnknownRoute />} />
      </Route>

      {/* Admin public pages */}
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin-home" element={<AdminHome />} />
      <Route path="/admin-about" element={<AdminAbout />} />
      <Route path="/admin-how-it-works" element={<AdminHowItWorks />} />

      {/* Admin panel */}
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
        <Route path="/admin-orders/:orderId" element={<AdminOrderDetails />} />
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
        <Route
          path="/admin-complaints/:complaintId"
          element={<AdminComplaintDetails />}
        />
        <Route path="/admin-rewards" element={<AdminRewards />} />
        <Route path="/admin-reports" element={<AdminReports />} />
        <Route path="/admin-settings" element={<AdminSettings />} />
        <Route path="/admin-team" element={<AdminTeam />} />
        <Route path="/admin-earnings" element={<AdminEarnings />} />
        <Route path="/admin-notifications" element={<AdminNotifications />} />
        <Route path="/admin-content" element={<AdminContent />} />
        <Route path="/admin-help" element={<AdminHelp />} />
        <Route path="/admin-states" element={<AdminStates />} />

        <Route path="/admin-shop" element={<AdminShop />} />
        <Route path="/admin-shop/product/:id" element={<AdminShopProduct />} />
        <Route path="/admin-shop/seller/:id" element={<AdminShopSeller />} />
        <Route path="/admin-shop/cart" element={<AdminShopCart />} />
        <Route path="/admin-shop/checkout" element={<AdminShopCheckout />} />
        <Route path="/admin-shop/success/:ids" element={<AdminShopSuccess />} />
        <Route path="/admin-shop/orders" element={<AdminShopOrders />} />
        <Route
          path="/admin-shop/orders/:orderId"
          element={<AdminShopOrderDetails />}
        />

        <Route path="/admin-sell" element={<AdminSell />} />
        <Route path="/admin-sell/new" element={<AdminSellForm />} />
        <Route path="/admin-sell/edit/:id" element={<AdminSellForm />} />
        <Route path="/admin-sell/listing/:id" element={<AdminSellListing />} />
        <Route path="/admin-sell/sales" element={<AdminSales />} />
        <Route
          path="/admin-sell/sales/:orderId"
          element={<AdminSaleDetails />}
        />
        {/* Keep older admin navigation destinations working. */}
        <Route
          path="/admin-profile"
          element={<Navigate to="/admin-settings" replace />}
        />
      </Route>

      {/* Admin unknown routes stay inside the admin shell; other unknown routes go home. */}
      <Route path="*" element={<RouteFallback />} />
    </Routes>
  );
}
