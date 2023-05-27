import { Request, Response, NextFunction } from "express";
import jwt, { Secret, VerifyErrors } from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// Middleware para verificar el token JWT
export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token: string | undefined = req.headers["authorization"] as string;

    if (!token) {
      res.status(403).json({ message: "Authentication token not provided." });
      return;
    }

    jwt.verify(
      token,
      process.env.JWT_SECRET as Secret,
      (err: VerifyErrors | null, decoded: any) => {
        if (err) {
          res.status(401).json({ message: "Invalid token." });
          return;
        }

        // Adjuntar la información del usuario decodificado al objeto de solicitud
        req.body.user = decoded.user;
        next();
      }
    );
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
