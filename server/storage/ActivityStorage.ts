import { Tenant as TenantModel, PaymentHistory as PaymentHistoryModel } from "../database";
import { ObjectId } from "mongodb";

/**
 * ActivityStorage - Handles activity logging and specialized operations
 * Scope: Payment plans, collection actions, activity logging, data cleanup
 * Collections: Tenant (for payment plans and collection actions), PaymentHistory (for cleanup)
 * 
 * NOTE: logActivity and logTenantActivity are in controllers, not here
 */
export class ActivityStorage {
  /**
   * Create payment plan for tenant
   * Payment plans allow for installment-based payments
   */
  async createPaymentPlan(paymentPlan: any): Promise<string> {
    try {
      const tenantDoc = await TenantModel.findById(paymentPlan.tenantId);
      if (!tenantDoc) {
        throw new Error('Tenant not found');
      }

      const planId = new ObjectId().toString();

      // Add payment plan to tenant's record
      await TenantModel.updateOne(
        { _id: new ObjectId(paymentPlan.tenantId) },
        {
          $push: {
            paymentPlans: {
              ...paymentPlan,
              _id: planId,
              createdAt: new Date()
            }
          }
        }
      );

      return planId;
    } catch (error) {
      console.error('Error creating payment plan:', error);
      throw error;
    }
  }

  /**
   * Record collection action
   * Collection actions track follow-ups for overdue payments
   */
  async recordCollectionAction(collectionAction: any): Promise<string> {
    try {
      const actionId = new ObjectId().toString();

      // Store collection actions as part of tenant data
      await TenantModel.updateOne(
        { _id: new ObjectId(collectionAction.tenantId) },
        {
          $push: {
            collectionActions: {
              ...collectionAction,
              _id: actionId,
              recordedAt: new Date()
            }
          }
        }
      );

      return actionId;
    } catch (error) {
      console.error('Error recording collection action:', error);
      throw error;
    }
  }

  /**
   * Delete payment history record
   * Used for removing corrupted or incorrect records
   * CAUTION: This removes the record permanently
   */
  async deletePaymentHistory(paymentId: string): Promise<boolean> {
    try {
      if (!this.isValidObjectId(paymentId)) {
        console.log('Invalid ObjectId format for payment ID:', paymentId);
        return false;
      }

      const result = await PaymentHistoryModel.deleteOne({ _id: paymentId });
      console.log(`🗑️ Deleted payment record: ${paymentId}`);
      return result.deletedCount === 1;
    } catch (error) {
      console.error('Error deleting payment history:', error);
      return false;
    }
  }

  /**
   * Helper function to validate ObjectId format
   */
  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }
}

export const activityStorage = new ActivityStorage();
