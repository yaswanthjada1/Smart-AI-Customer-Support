import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { TenantRequest } from '../../middleware/tenant';
import { CompanyService } from './companyService';
import { z } from 'zod';

const createCompanySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters').max(100),
  slug: z.string().max(100).optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  logo_url: z.string().url('Invalid logo URL').optional().or(z.literal('')),
});

const updateCompanySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  logo_url: z.string().url().optional().or(z.literal('')),
});

export class CompanyController {
  static async createCompany(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const parseResult = createCompanySchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
        return;
      }

      const result = await CompanyService.createCompany(req.user.id, parseResult.data);
      res.status(201).json(result);
    } catch (err: any) {
      console.error('[CompanyController.createCompany]', err);
      res.status(500).json({ error: err.message || 'Failed to create company workspace.' });
    }
  }

  static async getUserCompanies(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const companies = await CompanyService.getUserCompanies(req.user.id);
      res.json({ companies });
    } catch (err: any) {
      console.error('[CompanyController.getUserCompanies]', err);
      res.status(500).json({ error: err.message || 'Failed to fetch companies.' });
    }
  }

  static async getCompany(req: TenantRequest, res: Response): Promise<void> {
    try {
      if (!req.company) {
        res.status(404).json({ error: 'Company not found' });
        return;
      }

      res.json({
        company: req.company,
        membership: req.membership,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getMembers(req: TenantRequest, res: Response): Promise<void> {
    try {
      if (!req.company) {
        res.status(404).json({ error: 'Company not found' });
        return;
      }

      const members = await CompanyService.getCompanyMembers(req.company.id);
      res.json({ members });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async updateCompany(req: TenantRequest, res: Response): Promise<void> {
    try {
      if (!req.company) {
        res.status(404).json({ error: 'Company not found' });
        return;
      }

      const parseResult = updateCompanySchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
        return;
      }

      const updated = await CompanyService.updateCompany(req.company.id, parseResult.data);
      res.json({ company: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
