import express from "express";
import { UserModel } from "../models/UserModel.js";
import { UserController } from "../controllers/userController.js";
import { verifyToken } from "../middlewares/auth.js";
import { validateCustomHeader } from "../middlewares/customHeader.js";
import bcrypt from "bcrypt";

const router = express.Router();

export default function userRoutes(pool) {
  const userModel = new UserModel(pool);
  const userController = new UserController(pool);

  /**
   * @swagger
   * tags:
   *   name: User
   *   description: API User
   */

  /**
   * @swagger
   * /user:
   *   get:
   *     summary: Get all users
   *     tags: [User]
   *     responses:
   *       200:
   *         description: Success. Returns a list of users.
   *       500:
   *         description: Failed to get users.
   */
  router.get("/", verifyToken, validateCustomHeader, async (req, res) => {
    try {
      const users = await userModel.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error al obtener los usuarios:", error);
      res.status(500).json({ message: "Error al obtener los usuarios." });
    }
  });

  /**
   * @swagger
   * /user/login:
   *   post:
   *     summary: User login
   *     tags: [User]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               username:
   *                 type: string
   *                 example: user
   *               password:
   *                 type: string
   *                 example: 123
   *     responses:
   *       200:
   *         description: Success. Returns the JWT token.
   *       401:
   *         description: Invalid credentials.
   *       500:
   *         description: Failed to login.
   */
  router.post("/login", validateCustomHeader, userController.loginController);

  /**
   * @swagger
   * /user/{id}:
   *   get:
   *     summary: Get a user by ID
   *     tags: [User]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: User ID
   *     responses:
   *       200:
   *         description: Success. Returns the found user.
   *       404:
   *         description: User not found.
   *       500:
   *         description: Failed to get the user.
   */
  router.get("/:id", verifyToken, validateCustomHeader, async (req, res) => {
    const { id } = req.params;

    try {
      const user = await userModel.getUserById(parseInt(id));
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ message: "Usuario no encontrado." });
      }
    } catch (error) {
      console.error("Error al obtener el usuario:", error);
      res.status(500).json({ message: "Error al obtener el usuario." });
    }
  });

  /**
   * @swagger
   * /user/create:
   *   post:
   *     summary: Create a new user
   *     tags: [User]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               username:
   *                 type: string
   *               password:
   *                 type: string
   *               role:
   *                 type: string
   *     responses:
   *       200:
   *         description: Success. Returns the created user.
   *       500:
   *         description: Failed to create the user.
   */
  router.post(
    "/create",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      const { username, password, role, user } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);

      try {
        const user = await userModel.createUser(
          username,
          hashedPassword,
          role,
          user.company_id
        );
        res.json(user);
      } catch (error) {
        console.error("Error al crear el usuario:", error);
        res.status(500).json({ message: "Error al crear el usuario." });
      }
    }
  );

  /**
   * @swagger
   * /user/update/{id}:
   *   patch:
   *     summary: Update a user by ID
   *     tags: [User]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: User ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               username:
   *                 type: string
   *               password:
   *                 type: string
   *               role:
   *                 type: string
   *     responses:
   *       200:
   *         description: Success. Returns the updated user.
   *       404:
   *         description: User not found.
   *       500:
   *         description: Failed to update the user.
   */
  router.patch(
    "/update/:id",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      const { id } = req.params;
      const { username, password, role } = req.body;

      try {
        const updatedUser = await userModel.updateUser(
          parseInt(id),
          username,
          password,
          role
        );
        if (updatedUser) {
          res.json(updatedUser);
        } else {
          res.status(404).json({ message: "Usuario no encontrado." });
        }
      } catch (error) {
        console.error("Error al actualizar el usuario:", error);
        res.status(500).json({ message: "Error al actualizar el usuario." });
      }
    }
  );

  return router;
}
