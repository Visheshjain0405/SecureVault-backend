// src/routes/passwordRoutes.js
import { Router } from "express";
import { auth } from "../middleware/auth.js";
import {list,create,update,remove} from "../controllers/passwordController.js";

const router = Router();

router.use(auth);
router.get("/", list);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
