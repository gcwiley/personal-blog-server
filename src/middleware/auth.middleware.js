import jwt from 'jsonwebtoken';
import { SESSION_COOKIE_NAME } from '../controllers/auth.controller.js';

// throw an error if the JWT_SECRET is missing to prevent insecure defaults in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined.');
}

export const authenticateToken = (req, res, next) => {
  // the app JWT lives in an httpOnly cookie set by createSessionFromProxy — it is
  // never exposed to client-side JavaScript, so it is never sent via an
  // Authorization header
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No session cookie provided.' });
  }

  // verify the token using the JWT_SECRET and specify the expected algorithm
  jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (error, user) => {
    if (error) {
      // differentiate between expired and invalid tokens
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Session has expired.' }); // often 401 triggers a client refresh
      }
      // for other verification errors, return a 403 to indicate the token is invalid
      return res.status(403).json({ error: 'Invalid session.' });
    }

    // attach the decoded user information to the request object
    req.user = { id: user.id, email: user.email };
    // proceed to the next middleware or route handler
    next();
  });
};
