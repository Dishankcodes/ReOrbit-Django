import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LOGIN_PATH, SESSION_ENDED_EVENT, isSignedIn } from "../../api/session";

/* Route guard. Wrap a group of routes:

     <Route element={<RequireAuth role="user" />}>
       <Route element={<UserLayout />}> ... </Route>
     </Route>

   Not signed in, or signed in as another role, goes to that role's login page.
   When the API says the session is over (refresh failed) it redirects too. */
export default function RequireAuth({ role }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onEnded = () => navigate(LOGIN_PATH[role], { replace: true });
    window.addEventListener(SESSION_ENDED_EVENT, onEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onEnded);
  }, [role, navigate]);

  if (!isSignedIn(role)) {
    return (
      <Navigate
        to={LOGIN_PATH[role]}
        replace
        state={{ from: location.pathname }}
      />
    );
  }
  return <Outlet />;
}
