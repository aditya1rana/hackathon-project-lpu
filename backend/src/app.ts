import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './config/logger';

// ─── Module Routes ──────────────────────────────────────────
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import categoryRoutes from './modules/inventory/category.routes';
import requestRoutes from './modules/request/request.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import predictionRoutes from './modules/prediction/prediction.routes';
import procurementRoutes from './modules/procurement/procurement.routes';
import supplierRoutes from './modules/procurement/supplier.routes';
import notificationRoutes from './modules/notification/notification.routes';
import emailRoutes from './routes/email.routes';
import chatRoutes from './routes/chat.routes';

const app = express();

// ─── Security Middleware ────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ──────────────────────────────────────────
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ─── Body Parsing ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Request Logging ────────────────────────────────────────
app.use((req, _res, next) => {
  logger.http(`${req.method} ${req.url}`);
  next();
});

// ─── Health Check ───────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart Inventory Management System is running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    uptime: process.uptime(),
  });
});

// ─── API Routes ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/procurements', procurementRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/chat', chatRoutes);

// ─── 404 Handler ────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// ─── Global Error Handler ───────────────────────────────────
app.use(errorHandler);

export default app;
