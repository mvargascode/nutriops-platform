import { Router } from "express";
import { issueTicket } from "./kiosk.controller";

const router = Router();

router.post("/issue", issueTicket);

export default router;
