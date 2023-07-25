// Middleware to validate the custom header
export const validateCustomHeader = (req, res, next) => {
  try {
    const protectedRoutes = ["/", "/webhook"];

    if (!protectedRoutes.includes(req.route?.path)) {
      const customHeader = req.headers["x-ef-perfumes"];

      if (customHeader && customHeader === process.env.CUSTOM_HEADER) {
        next();
      } else {
        res.status(401).json({ message: "Unauthorized access" });
      }
    } else {
      next();
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
