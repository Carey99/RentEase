/**
 * Type definitions for paystack-node v0.3.0
 * Minimal type declarations for Paystack SDK
 */

declare module 'paystack-node' {
  interface PaystackResponse<T = any> {
    status: boolean;
    message: string;
    data: T;
  }

  interface SubaccountData {
    id: number;
    subaccount_code: string;
    business_name: string;
    settlement_bank: string;
    account_number: string;
    percentage_charge: number;
    description?: string;
    metadata?: Record<string, any>;
  }

  interface TransactionData {
    reference: string;
    authorization_url: string;
    access_code: string;
    amount: number;
    currency: string;
    status: 'success' | 'failed' | 'pending' | 'abandoned';
    paid_at?: string;
    channel?: string;
    gateway_response?: string;
    metadata?: Record<string, any>;
  }

  interface BankData {
    id: number;
    name: string;
    slug: string;
    code: string;
    country: string;
    currency: string;
    type: string;
  }

  interface SubaccountCreateParams {
    business_name: string;
    settlement_bank: string;
    account_number: string;
    percentage_charge: number;
    description?: string;
    metadata?: Record<string, any>;
  }

  interface TransactionInitializeParams {
    amount: number;
    email: string;
    reference: string;
    currency?: string;
    channels?: string[];
    metadata?: Record<string, any>;
    subaccount?: string;
  }

  interface ListBanksParams {
    country: string;
    currency?: string;
    type?: string;
  }

  class Paystack {
    constructor(secretKey: string, env?: 'test' | 'live');

    subaccount: {
      create(params: SubaccountCreateParams): Promise<PaystackResponse<SubaccountData>>;
      list(): Promise<PaystackResponse<SubaccountData[]>>;
      fetch(idOrCode: string | number): Promise<PaystackResponse<SubaccountData>>;
      update(idOrCode: string | number, params: Partial<SubaccountCreateParams>): Promise<PaystackResponse<SubaccountData>>;
    };

    transaction: {
      initialize(params: TransactionInitializeParams): Promise<PaystackResponse<TransactionData>>;
      verify(reference: string): Promise<PaystackResponse<TransactionData>>;
      list(): Promise<PaystackResponse<TransactionData[]>>;
      fetch(id: number): Promise<PaystackResponse<TransactionData>>;
    };

    miscellaneous: {
      list_banks(params: ListBanksParams): Promise<PaystackResponse<BankData[]>>;
    };
  }

  export = Paystack;
}
