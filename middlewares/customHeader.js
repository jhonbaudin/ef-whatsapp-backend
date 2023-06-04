// Middleware to validate the custom header
export const validateCustomHeader = (req, res, next) => {
  try {
    // Check if the route requires the custom header
    const protectedRoutes = ["/", "/webhook"];

    if (!protectedRoutes.includes(req.route?.path)) {
      const customHeader = req.headers["x-ef-perfumes"];

      // Check if the custom header is present
      if (customHeader && customHeader === process.env.CUSTOM_HEADER) {
        // The custom header is valid, continue with the next middleware function
        next();
      } else {
        // The custom header is invalid or not present
        res.status(401).json({ message: "Unauthorized access" });
      }
    } else {
      // The route does not require the custom header, continue with the next middleware function
      next();
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
