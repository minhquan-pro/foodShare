import { Router } from "express";
import * as reportsController from "./reports.controller.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import { reportUserSchema } from "./reports.validation.js";

const router = Router();

router.use(authenticate);

// Get my reports
router.get("/", reportsController.getMyReports);

// Report a user
router.post("/:id", validate(reportUserSchema), reportsController.reportUser);

export default router;
