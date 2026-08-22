import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { query } from '../db';
import { Company, CompanyMember, UserRole } from '../types';

export interface TenantRequest extends AuthenticatedRequest {
  company?: Company;
  membership?: CompanyMember;
}

const roleHierarchy: Record<UserRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

export function requireCompanyMembership(minRole: UserRole = 'member') {
  return async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'User must be authenticated.' });
      return;
    }

    const companyId = (req.headers['x-company-id'] as string) || req.params.companyId || req.body.company_id || req.query.company_id;

    if (!companyId) {
      res.status(400).json({ error: 'Company ID is required in X-Company-Id header, route parameter, or query.' });
      return;
    }

    try {
      // Find company
      const companyRes = await query<Company>(
        'SELECT id, name, slug, website, logo_url, created_at FROM companies WHERE id = $1 LIMIT 1',
        [companyId]
      );

      if (companyRes.rows.length === 0) {
        res.status(404).json({ error: 'Company workspace not found.' });
        return;
      }

      // Check user membership in this specific company
      const memberRes = await query<CompanyMember>(
        'SELECT id, company_id, user_id, role, created_at FROM company_members WHERE company_id = $1 AND user_id = $2 LIMIT 1',
        [companyId, req.user.id]
      );

      if (memberRes.rows.length === 0) {
        // Strict tenant isolation: user does not belong to this company
        res.status(403).json({ error: 'Forbidden: You are not a member of this company workspace.' });
        return;
      }

      const membership = memberRes.rows[0];
      const userLevel = roleHierarchy[membership.role] || 0;
      const requiredLevel = roleHierarchy[minRole] || 1;

      if (userLevel < requiredLevel) {
        res.status(403).json({ error: `Forbidden: This action requires at least '${minRole}' role permissions.` });
        return;
      }

      req.company = companyRes.rows[0];
      req.membership = membership;
      next();
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to verify tenant authorization: ' + err.message });
    }
  };
}
