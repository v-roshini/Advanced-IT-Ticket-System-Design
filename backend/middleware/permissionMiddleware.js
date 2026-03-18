const prisma = require("../config/prisma");

/**
 * Middleware to check if the current user has a specific permission enabled for their role.
 * @param {string} permissionKey - The key of the permission to check (e.g., 'can_view_billing')
 */
const checkPermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      // Admins bypass all internal role-based checks for simplicity, 
      // but we can enforce it if strictly needed.
      if (req.user.role === 'admin') {
        return next();
      }

      const permission = await prisma.permission.findFirst({
        where: {
          role: req.user.role,
          permission_key: permissionKey,
          is_enabled: true
        }
      });

      if (!permission) {
        return res.status(403).json({ 
          message: `Access Denied: You do not have permission to perform this action (${permissionKey})` 
        });
      }

      next();
    } catch (err) {
      console.error("Permission Middleware Error:", err);
      res.status(500).json({ message: "Internal server error during permission check" });
    }
  };
};

module.exports = { checkPermission };
