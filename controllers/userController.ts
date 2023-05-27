import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Pool } from "pg";
import { UserModel, User } from "../models/User";

export class UserController {
  private userModel: UserModel;

  constructor(pool: Pool) {
    this.userModel = new UserModel(pool);
  }

  public loginController = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { username, password } = req.body;

    try {
      // Obtener el usuario por nombre de usuario
      const user: User | null = await this.userModel.getUserByUsername(
        username
      );

      if (!user) {
        // Si no se encuentra el usuario, retornar error de autenticación
        res.status(401).json({ error: "Authentication failed" });
        return;
      }

      // Comparar la contraseña ingresada con la contraseña almacenada en la base de datos
      const passwordMatch: boolean = await bcrypt.compare(
        password,
        user.password
      );

      if (!passwordMatch) {
        // Si las contraseñas no coinciden, retornar error de autenticación
        res.status(401).json({ error: "Authentication failed" });
        return;
      }

      // Generar el token JWT
      const token: string = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || ""
      );

      // Retornar la respuesta exitosa con el token
      res.status(200).json({ message: "Login successful", token });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
