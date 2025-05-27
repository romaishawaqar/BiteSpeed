import express from 'express';
import identify from '../controllers/identifyController.js';

const router = express.Router();

// POST /identify
router.post('/', identify);

export default router;
