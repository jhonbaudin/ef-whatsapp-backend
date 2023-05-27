import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { UserModel } from "../models/UserModel.js";

export class UserController {
  constructor(pool) {
    this.userModel = new UserModel(pool);
  }

  loginController = async (req, res) => {
    const { username, password } = req.body;

    try {
      const user = await this.userModel.getUserByUsername(username);

      if (!user) {
        console.log("noexiste", req.body);

        res.status(401).json({ error: "Authentication failed" });
        return;
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        console.log("no hace match", password, user.password);

        res.status(401).json({ error: "Authentication failed" });
        return;
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || ""
      );

      res.status(200).json({ message: "Login successful", token });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
