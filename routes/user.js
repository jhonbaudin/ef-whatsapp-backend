import express from "express";
import { UserModel } from "../models/UserModel.js";
import { UserController } from "../controllers/userController.js";
import { verifyToken } from "../middlewares/auth.js";
import { validateCustomHeader } from "../middlewares/customHeader.js";

const router = express.Router();

export default function userRoutes(pool) {
  const userModel = new UserModel(pool);
  const userController = new UserController(pool);

  /**
   * @swagger
   * tags:
   *   name: User
   *   description: User API
   */

  /**
   * @swagger
   * /user:
   *   get:
   *     summary: Get all users
   *     tags: [User]
   *     responses:
   *       200:
   *         description: Returns a list of users
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Failed to get users
   */
  router.get("/", verifyToken, validateCustomHeader, async (req, res) => {
    const { user } = req.body;

    try {
      const users = await userModel.getUsers(user.company_id);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Error getting the users." });
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
   *               tokenFirebase:
   *                 type: string
   *                 example: 123
   *     responses:
   *       200:
   *         description: Returns the login information
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: User not found
   *       500:
   *         description: Failed to login
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
   *         description: Found user
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: User not found
   *       500:
   *         description: Failed to get the user
   *
   */
  router.get("/:id", verifyToken, validateCustomHeader, async (req, res) => {
    const { id } = req.params;
    const { user } = req.body;

    if (!id) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      const userFound = await userModel.getUserById(id, user.company_id);
      if (userFound) {
        res.json(userFound);
      } else {
        res.status(404).json({ message: "User not found." });
      }
    } catch (error) {
      res.status(500).json({ message: "Error getting the user." });
    }
  });

  /**
   * @swagger
   * /user:
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
   *               company_phones_ids:
   *                 type: string
   *               weight:
   *                 type: number
   *               work_schedule:
   *                 type: string
   *     responses:
   *       201:
   *         description: Success. Returns the created user
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: Conversation not found or no messages available
   *       500:
   *         description: Failed to create the user
   */
  router.post("/", verifyToken, validateCustomHeader, async (req, res) => {
    const {
      username,
      password,
      role,
      user,
      company_phones_ids,
      weight,
      work_schedule,
    } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      const newUser = await userModel.createUser(
        username,
        password,
        role,
        user.company_id,
        company_phones_ids,
        weight,
        work_schedule
      );
      res.status(201).json(newUser);
    } catch (error) {
      res.status(500).json({ message: "Error creating the user." });
    }
  });

  /**
   * @swagger
   * /user/{id}:
   *   put:
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
   *               company_phones_ids:
   *                 type: string
   *               weight:
   *                 type: number
   *               work_schedule:
   *                 type: string
   *     responses:
   *       200:
   *         description: Returns the updated user
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: User not found
   *       500:
   *         description: Failed to update the user
   */
  router.put("/:id", verifyToken, validateCustomHeader, async (req, res) => {
    const { id } = req.params;
    const { username, role, user, company_phones_ids, weight, work_schedule } =
      req.body;

    if (!id) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      const updatedUser = await userModel.updateUser(
        id,
        username,
        role,
        user.company_id,
        company_phones_ids,
        weight,
        work_schedule
      );
      if (updatedUser) {
        res.json(updatedUser);
      } else {
        res.status(404).json({ message: "User not found." });
      }
    } catch (error) {
      res.status(500).json({ message: "Error updating the user." });
    }
  });

  /**
   * @swagger
   * /user/{id}:
   *   delete:
   *     tags: [User]
   *     summary: Delete an user
   *     parameters:
   *       - in: path
   *         name: id
   *         description: User ID
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: User deleted successfully
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error deleting the user
   */
  router.delete("/:id", verifyToken, validateCustomHeader, async (req, res) => {
    const { id } = req.params;
    const { user } = req.body;

    if (!id) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      await userModel.deleteUser(id, user.company_id);
      res.json({ message: "User deleted successfully." });
    } catch (error) {
      res.status(500).json({ message: "Error deleting the user." });
    }
  });

  /**
   * @swagger
   * /user/password/{id}:
   *   put:
   *     summary: Change password for user by ID
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
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Returns the updated user
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: User not found
   *       500:
   *         description: Failed to update the password
   */
  router.patch(
    "/password/:id",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      const { id } = req.params;
      const { password, user } = req.body;

      if (!id || !password) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      try {
        const updatedPasswordUser = await userModel.updatePasswordUser(
          id,
          password,
          user.company_id
        );
        if (updatedPasswordUser) {
          res.json(updatedPasswordUser);
        } else {
          res.status(404).json({ message: "User not found." });
        }
      } catch (error) {
        res.status(500).json({ message: "Error updating the password." });
      }
    }
  );

  return router;
}
