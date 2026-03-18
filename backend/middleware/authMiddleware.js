const jwt = require("jsonwebtoken");
require("dotenv").config();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader)
    return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Admin access only" });
  next();
};

const prisma = require("../config/prisma");

const logAction = async (userId, action, details, ip) => {
  try {
    await prisma.systemLog.create({
      data: {
        user_id: userId,
        action,
        details,
        ip_address: ip || "Unknown"
      }
    });
  } catch (err) {
    console.error("Logging failed:", err.message);
  }
};

module.exports = { verifyToken, isAdmin, logAction };
