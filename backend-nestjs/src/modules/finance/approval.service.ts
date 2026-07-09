import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { ConflictError } from '../../common/errors/business-errors';
import { bi } from '../../common/utils/helpers';
import logger from '../../common/utils/logger';

/**
 * Port of backend/src/services/approvalService.js.
 */
@Injectable()
export class ApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationService,
  ) {}

  private getTableName(entityType: string): string {
    const map: Record<string, string> = {
      transaction: 'fund_transactions',
      campaign_assignment: 'campaign_assignments',
      campaign_confirmation: 'campaign_assignments',
    };
    const tableName = map[entityType];
    if (!tableName) throw new Error(`Unknown entity type: ${entityType}`);
    return tableName;
  }

  private getPendingStatus(tableName: string): string {
    return tableName === 'campaign_assignments' ? 'pending_approval' : 'pending';
  }

  async submitForApproval(
    entity: any,
    submittedBy: number | string | bigint,
    entityType: string,
  ): Promise<void> {
    try {
      const tableName = this.getTableName(entityType);
      await (this.prisma as any)[tableName].update({
        where: { id: bi(entity.id) },
        data: { status: 'pending', updated_at: new Date() },
      });

      await this.notification.emitEvent('approval.pending', {
        entity_id: entity.id,
        entity_type: entityType,
        team_id: entity.team_id,
        submitted_by: submittedBy,
      });

      logger.info('Approval submitted', {
        entity_id: entity.id,
        entity_type: entityType,
        team_id: entity.team_id,
        submitted_by: submittedBy,
      });
    } catch (error: any) {
      logger.error('Failed to submit for approval', {
        error: error.message,
        entity_id: entity.id,
        entityType,
      });
      throw error;
    }
  }

  async approveEntity(
    entityId: number | string | bigint,
    entityType: string,
    approvedBy: number | string | bigint,
    approvalNotes: string | null = null,
  ): Promise<void> {
    try {
      const tableName = this.getTableName(entityType);
      const entity = await (this.prisma as any)[tableName].findUnique({
        where: { id: bi(entityId) },
      });
      if (!entity) {
        throw new Error(`${entityType} with id ${entityId} not found`);
      }

      const updateData: any = {
        status: 'approved',
        approved_by: bi(approvedBy),
        approved_at: new Date(),
        updated_at: new Date(),
      };
      if (approvalNotes) updateData.approval_notes = approvalNotes;

      const pendingStatus = this.getPendingStatus(tableName);
      const { count } = await (this.prisma as any)[tableName].updateMany({
        where: { id: bi(entityId), status: pendingStatus },
        data: updateData,
      });
      if (count === 0) {
        throw new ConflictError(
          `${entityType} with id ${entityId} is already processed`,
        );
      }

      await this.notification.emitEvent('approval.approved', {
        entity_id: entityId,
        entity_type: entityType,
        team_id: entity.team_id,
        approved_by: approvedBy,
        approval_notes: approvalNotes,
      });

      logger.info('Entity approved', {
        entity_id: entityId,
        entity_type: entityType,
        team_id: entity.team_id,
        approved_by: approvedBy,
      });
    } catch (error: any) {
      logger.error('Failed to approve entity', {
        error: error.message,
        entity_id: entityId,
        entityType,
      });
      throw error;
    }
  }

  async rejectEntity(
    entityId: number | string | bigint,
    entityType: string,
    rejectedBy: number | string | bigint,
    reason: string,
  ): Promise<void> {
    try {
      const tableName = this.getTableName(entityType);
      const entity = await (this.prisma as any)[tableName].findUnique({
        where: { id: bi(entityId) },
      });
      if (!entity) {
        throw new Error(`${entityType} with id ${entityId} not found`);
      }

      const updateData: any = {
        status: 'rejected',
        updated_at: new Date(),
      };
      if (reason) {
        updateData[
          tableName === 'campaign_assignments'
            ? 'rejected_reason'
            : 'rejection_reason'
        ] = reason;
      }
      if (tableName === 'campaign_assignments') {
        updateData.rejected_at = new Date();
      } else {
        updateData.rejected_by = bi(rejectedBy);
        updateData.rejected_at = new Date();
      }

      const pendingStatus = this.getPendingStatus(tableName);
      const { count } = await (this.prisma as any)[tableName].updateMany({
        where: { id: bi(entityId), status: pendingStatus },
        data: updateData,
      });
      if (count === 0) {
        throw new ConflictError(
          `${entityType} with id ${entityId} is already processed`,
        );
      }

      await this.notification.emitEvent('approval.rejected', {
        entity_id: entityId,
        entity_type: entityType,
        team_id: entity.team_id,
        rejected_by: rejectedBy,
        reason,
      });

      logger.info('Entity rejected', {
        entity_id: entityId,
        entity_type: entityType,
        team_id: entity.team_id,
        rejected_by: rejectedBy,
      });
    } catch (error: any) {
      logger.error('Failed to reject entity', {
        error: error.message,
        entity_id: entityId,
        entityType,
      });
      throw error;
    }
  }

  async getPendingApprovals(
    teamId: number | string | bigint,
    approvalType = 'all',
  ): Promise<any[]> {
    const results: any[] = [];

    if (approvalType === 'transaction' || approvalType === 'all') {
      const transactions = await this.prisma.fund_transactions.findMany({
        where: { team_id: bi(teamId), status: 'pending' },
        select: {
          id: true,
          team_id: true,
          campaign_id: true,
          submitted_by: true,
          amount: true,
          status: true,
          bill_image_url: true,
          transaction_date: true,
          created_at: true,
        },
        orderBy: { created_at: 'asc' },
      });
      results.push(
        ...transactions.map((t: any) => ({ ...t, entity_type: 'transaction' })),
      );
    }

    if (approvalType === 'campaign_confirmation' || approvalType === 'all') {
      const rows = await this.prisma.raw<any[]>(
        `SELECT ca.id, ca.campaign_id, ca.user_id, ca.status, ca.bill_image_url,
                ca.created_at, c.name AS campaign_name, c.team_id
         FROM campaign_assignments ca
         JOIN campaigns c ON ca.campaign_id = c.id
         WHERE c.team_id = $1 AND ca.status = 'pending_approval'
         ORDER BY ca.created_at ASC`,
        bi(teamId),
      );
      results.push(
        ...rows.map((c: any) => ({ ...c, entity_type: 'campaign_confirmation' })),
      );
    }

    logger.info('Fetched pending approvals', {
      team_id: teamId,
      approval_type: approvalType,
      count: results.length,
    });
    return results;
  }
}
