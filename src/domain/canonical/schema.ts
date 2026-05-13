/**
 * Zod schemas for runtime validation of canonical entities.
 * Money is always serialized as a decimal STRING + currency, never a number.
 */
import { z } from 'zod';

export const zCurrency = z.string().min(3).max(3).default('CHF');

export const zMoney = () =>
  z.object({
    amount: z.string().regex(/^-?\d+(\.\d+)?$/, 'amount must be a decimal string'),
    currency: zCurrency,
  });

export const zProvenance = z.object({
  source_type: z.enum(['manual', 'ai', 'imported', 'migrated']),
  source_document_id: z.string().uuid().optional(),
  extraction_model: z.string().optional(),
  confidence_score: z.number().min(0).max(1).optional(),
  extracted_at: z.string().datetime().optional(),
  reviewed_by: z.string().uuid().optional(),
  reviewed_at: z.string().datetime().optional(),
});

export const zTracked = <T extends z.ZodTypeAny>(inner: T) =>
  z.object({ value: inner, provenance: zProvenance });

export const zCanton = z.enum([
  'AG','AI','AR','BE','BL','BS','FR','GE','GL','GR','JU','LU','NE','NW','OW','SG',
  'SH','SO','SZ','TG','TI','UR','VD','VS','ZG','ZH',
]);

export const zDossierStatus = z.enum(['draft', 'in_review', 'submitted', 'exported', 'archived']);
export const zPersonRole = z.enum(['taxpayer', 'spouse', 'child', 'dependent']);
