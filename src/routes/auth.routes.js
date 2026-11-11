import { Router } from 'express';
import {
  createSessionFromProxy,
  signOutUser,
} from '../controllers/auth.controller.js';

// --- AUTH ROUTER ---
export const authRouter = Router();

// POST /api/auth/session
// Exchanges an OAuth2 Proxy-authenticated (Google SSO) session for an app JWT
authRouter.post('/session', createSessionFromProxy);

// POST /api/auth/signout
authRouter.post('/signout', signOutUser);
