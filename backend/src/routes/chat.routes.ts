import { Router, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../shared/utils/response';
import prisma from '../config/database';
import { logger } from '../config/logger';

const router = Router();

/**
 * @route POST /api/chat
 * @desc  Chat with Gemini AI about inventory items and the system
 */
router.post('/', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { message } = req.body;
    if (!message) {
      sendError(res, 'Message is required', 400);
      return;
    }

    // Fetch a compact inventory summary for context (fewer tokens = less quota)
    const [items, totalCount] = await Promise.all([
      prisma.inventoryItem.findMany({
        take: 15,
        orderBy: { updatedAt: 'desc' },
        select: {
          name: true,
          quantity: true,
          minStock: true,
          categoryId: true,
        },
      }),
      prisma.inventoryItem.count(),
    ]);

    const inventoryContext = items.map(i => {
      const status = i.quantity === 0 ? 'OUT' : i.quantity <= i.minStock ? 'LOW' : 'OK';
      return `${i.name}: ${i.quantity} units [${status}]`;
    }).join(', ');

    const lowCount = items.filter(i => i.quantity <= i.minStock).length;

    const systemPrompt = `You are a helpful AI assistant for a Smart Inventory Management System. Answer concisely.

Inventory (${totalCount} items, latest 15): ${inventoryContext}
Low stock: ${lowCount} items. 

The system supports: inventory CRUD, analytics, AI predictions, notifications, email alerts, bulk upload via Google Sheets, procurement, and user management.

User question: ${message}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      sendError(res, 'Gemini API key not configured', 500);
      return;
    }

    const models = ['gemini-2.5-flash', 'gemini-2.0-flash-lite'];
    let reply = '';
    let success = false;

    for (const model of models) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData: any = await geminiRes.json();
          reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (reply) {
            success = true;
            logger.info(`Chat response from ${model}`);
            break;
          }
        } else {
          const errText = await geminiRes.text();
          logger.warn(`Gemini ${model} failed (${geminiRes.status}): ${errText.substring(0, 150)}`);
          if (geminiRes.status === 429) {
            // Wait a bit before trying next model
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          continue;
        }
      } catch (err: any) {
        logger.warn(`Gemini ${model} error: ${err.message}`);
        continue;
      }
    }

    if (success && reply) {
      sendSuccess(res, { reply }, 'Chat response generated');
    } else {
      sendError(res, 'AI is temporarily unavailable due to rate limits. Please wait 30 seconds and try again.', 503);
    }
  } catch (error) {
    next(error);
  }
});

export default router;
