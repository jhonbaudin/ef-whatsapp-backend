import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { UserModel } from "../models/UserModel.js";

export class UserController {
  constructor(pool) {
    this.userModel = new UserModel(pool);
  }

  loginController = async (req, res) => {
    const { username, password, tokenFirebase } = req.body;

    try {
      const user = await this.userModel.getUserByUsername(username);

      if (!user) {
        res.status(404).json({ error: "Not Found" });
        return;
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        res.status(401).json({ error: "Authentication failed" });
        return;
      }

      if (tokenFirebase) {
        this.userModel.setTokenFirebase(user.id, tokenFirebase);
      }

      const token = jwt.sign(
        { id: user.id, role: user.role, company_id: user.company_id },
        process.env.JWT_SECRET || ""
      );

      res.status(200).json({
        message: "Login successful",
        token,
        company_phones: user.phones,
        role: user.role,
        id: user.id,
        image: user.image,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
