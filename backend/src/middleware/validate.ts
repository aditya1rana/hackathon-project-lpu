import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validation middleware factory.
 * Validates request body, query, or params against a Zod schema.
 *
 * @example
 * router.post('/items', validate(createItemSchema), controller.create);
 * router.get('/items', validate(querySchema, 'query'), controller.list);
 */
export function validate(
  schema: ZodSchema,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors: formattedErrors,
        });
        return;
      }
      next(error);
    }
  };
}
