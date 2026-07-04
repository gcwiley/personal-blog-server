import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
// spacer
import express from 'express';
import logger from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { sequelize, connectToDatabase } from './db/connect_to_sqldb.js';
import './models/index.js';

// --- IMPORT ROUTERS ---
import { postRouter } from './routes/post.routes.js';
import { userRouter } from './routes/user.routes.js';
import { authRouter } from './routes/auth.routes.js';

// --- CONFIGURATION ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:4200';
const angularDistPath = path.join(__dirname, './dist/my-blog-client/browser');

// --- EXPRESS SETUP ---
// create express app instance
const app = express();
// trust first proxy for secure cookies when behind a proxy (e.g. GAE)
app.set('trust proxy', 1);

// --- HELMET ---
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"], // add hashes here if Angular inline scripts are blocked
        scriptSrcAttr: ["'unsafe-inline'"], // allows inline event handlers (e.g. onclick) from Angular/libraries; fix at source when possible
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'], // blob: added for NgOptimizedImage
        fontSrc: ["'self'", 'data:'], // data: for inlined base64 fonts
        connectSrc: ["'self'"], // explicit (was falling back to default-src)
        objectSrc: ["'none'"], // security best practice
        baseUri: ["'self'"], // prevents <base> tag injection
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  }),
);

// --- CORS ---
app.use(
  cors({
    origin: CORS_ORIGIN,
    // allow credentials (cookies) to be sent in cross-origin requests
    credentials: true,
  }),
);

// --- MORGAN LOGGER ---
app.use(logger(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// --- BODY PARSERS ---
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// --- STATIC FILES ---
app.use(express.static(angularDistPath));

// serve uploaded attachments
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// --- API RATE LIMITING ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes.',
});

// stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many auth attempts, please try again after 15 minutes.',
});

// apply the rate limiting middleware to API calls
app.use('/api', apiLimiter);

// --- ROUTES ---
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/posts', postRouter);
app.use('/api/users', userRouter);

// catch-all route to serve Angular app for any non-API routes (for client-side routing)
app.get('{*splat}', (req, res) => {
  res.sendFile(path.join(angularDistPath, 'index.html'));
});

// global error handler - express requires 4 args for error handlers
app.use((error, req, res, next) => {
  console.error(chalk.red('Server Error:', error.stack));
  // ensure we don't try to send a response if one was already sent
  if (res.headersSent) {
    return next(error);
  }
  res.status(500).json({ error: 'Internal Server Error' });
});

// --- STARTUP SEQUENCE ---
const startServer = async () => {
  try {
    // 1. establish DB connection
    await connectToDatabase();

    // 2. sync models
    if (process.env.NODE_ENV !== 'production') {
      // in development, sync models with the database (alter tables to match models)
      await sequelize.sync({ alter: true });
      console.log(chalk.green('Database models synced successfully.'));
    }

    // 3. start listening for requests
    const server = app.listen(PORT, () => {
      console.log(chalk.blueBright(`\nServer running on port ${PORT}\n`));
    });

    // 4. graceful shutdown — handle both SIGINT and SIGTERM
    const shutdown = async (signal) => {
      console.log(
        chalk.yellow(`${signal} received. Gracefully shutting down...`),
      );
      await sequelize.close();
      server.close(() => {
        console.log(chalk.green('Server closed.'));
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error(chalk.red('Failed to start server:', error));
    process.exit(1);
  }
};

startServer();
