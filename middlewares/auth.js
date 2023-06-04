import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// Middleware to verify the JWT token
export const verifyToken = (req, res, next) => {
  try {
    const token = req.headers["authorization"];

    if (!token) {
      res.status(403).json({ message: "Authentication token not provided." });
      return;
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        res.status(401).json({ message: "Invalid token." });
        return;
      }

      req.body.user = decoded;
      next();
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
};
