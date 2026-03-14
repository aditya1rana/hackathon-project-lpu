import { Router, Request, Response, NextFunction } from 'express';
import { sendEmail, buildAlertEmail } from '../services/email.service';
import { sendSuccess, sendError } from '../shared/utils/response';

const router = Router();

/**
 * @route POST /api/email/notify
 * @desc  Send an email notification (used by frontend for inventory alerts)
 */
router.post('/notify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { to, subject, message } = req.body;
    
    if (!to || !subject || !message) {
      sendError(res, 'Missing required fields: to, subject, message', 400);
      return;
    }

    const html = buildAlertEmail(subject, message);
    const result = await sendEmail(to, `[Smart Inventory] ${subject}`, html);
    
    if (result.success) {
      sendSuccess(res, { messageId: result.messageId }, 'Email sent successfully');
    } else {
      sendError(res, result.error || 'Failed to send email', 500);
    }
  } catch (error) {
    next(error);
  }
});

export default router;
