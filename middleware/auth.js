const STAY_ON_PAGE_WHEN_GUEST = [
  "/cart/add",
  "/orders/checkout",
  "/orders/create"
];

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }

  req.flash("error", "Please log in first to continue");

  const currentPath = (req.baseUrl || "") + (req.path || "");
  const shouldStayOnSamePage = STAY_ON_PAGE_WHEN_GUEST.some((p) => currentPath.startsWith(p));

  if (shouldStayOnSamePage) {
    const referer = req.get("referer");
    if (referer) return res.redirect(referer);
  }

  return res.redirect("/auth/login");
};

const requireRole = (allowedRoles, accessDeniedMessage) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return isLoggedIn(req, res, next);
    }

    if (req.user && roles.includes(req.user.role)) {
      return next();
    }

    req.flash("error", accessDeniedMessage || "Access denied for your role.");
    return res.redirect("/home");
  };
};

const isAdmin = requireRole("admin", "Access denied. Admin privileges required.");
const isOwner = requireRole("owner", "Access denied. Owner privileges required.");
const isUser = requireRole("user", "Access denied. User privileges required.");

const isNotLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  return res.redirect("/");
};

module.exports = { isLoggedIn, isAdmin, isOwner, isUser, requireRole, isNotLoggedIn };
