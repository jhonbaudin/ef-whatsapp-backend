// Middleware para verificar el custom header
export const validateCustomHeader = (req, res, next) => {
  try {
    // Verificar si la ruta requiere el custom header
    const protectedRoutes = ["/", "/webhook"];

    if (!protectedRoutes.includes(req.route?.path)) {
      const customHeader = req.headers["x-ef-perfumes"];

      // Verificar si el custom header está presente
      if (customHeader && customHeader === process.env.CUSTOM_HEADER) {
        // El custom header es válido, continuar con la siguiente función de middleware
        next();
      } else {
        // El custom header es inválido o no está presente
        res.status(401).json({ message: "Unauthorized access" });
      }
    } else {
      // La ruta no requiere el custom header, continuar con la siguiente función de middleware
      next();
    }
  } catch (error) {
    console.error("Error al verificar el custom header:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
