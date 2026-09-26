/**
 * Menial Mobile - Mobile Payment Service Bridge
 * 
 * Coordinates multi-channel mobile escrow payments conforming to:
 * - Master Specification §37, §38, §39, §40, §41, §44
 * - CBN Mobile Payment Guidelines & NIP Instant Settlement
 * - Paystack / Monnify mobile checkout rails (Card, Virtual Account, USSD)
 */

import { Linking, Platform } from 'react-native';
import {
  NigerianPaymentRails,
  NigerianBankRailInfo,
  PaymentChannel,
  VirtualAccountDetails,
  UssdPaymentDetails,
  CardPaymentDetails,
  InitializePaymentOptions,
  PaymentInitializationResult,
} from '@shared/services/payment/PaymentService';
import { ApiService } from '../api';

export interface CardFormState {
  cardNumber: string;
  expiry: string; // MM/YY
  cvv: string;
  cardholderName: string;
  saveCard: boolean;
}

export interface CardValidationResult {
  isValid: boolean;
  brand: 'visa' | 'mastercard' | 'verve' | 'unknown';
  errors: {
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
  };
}

export class MobilePaymentService {
  /**
   * Retrieves list of supported Nigerian commercial banks for virtual transfers and USSD.
   */
  public static getSupportedBanks(): NigerianBankRailInfo[] {
    return NigerianPaymentRails.SUPPORTED_BANKS;
  }

  /**
   * Detects card brand based on BIN prefix (Visa, Mastercard, Verve).
   */
  public static detectCardBrand(cardNumber: string): 'visa' | 'mastercard' | 'verve' | 'unknown' {
    return NigerianPaymentRails.detectCardBrand(cardNumber);
  }

  /**
   * Formats raw card number string into 4-digit groups (e.g., "4111 2222 3333 4444").
   */
  public static formatCardNumber(text: string): string {
    return NigerianPaymentRails.formatCardNumber(text);
  }

  /**
   * Formats expiry input into MM/YY format.
   */
  public static formatExpiry(text: string): string {
    const clean = text.replace(/\D/g, '').slice(0, 4);
    if (clean.length > 2) {
      return `${clean.slice(0, 2)}/${clean.slice(2)}`;
    }
    return clean;
  }

  /**
   * Validates card form inputs with Luhn check and date verification.
   */
  public static validateCardForm(form: CardFormState): CardValidationResult {
    const brand = NigerianPaymentRails.detectCardBrand(form.cardNumber);
    const errors: CardValidationResult['errors'] = {};

    const cleanCard = form.cardNumber.replace(/\s+/g, '');
    if (!cleanCard) {
      errors.cardNumber = 'Card number is required.';
    } else if (!NigerianPaymentRails.validateCardNumber(cleanCard)) {
      errors.cardNumber = 'Invalid card number. Please check card digits.';
    }

    const cleanExpiry = form.expiry.replace(/\s+/g, '');
    const [month, year] = cleanExpiry.split('/');
    if (!cleanExpiry || !month || !year) {
      errors.expiry = 'MM/YY required.';
    } else if (!NigerianPaymentRails.validateCardExpiry(month, year)) {
      errors.expiry = 'Card is expired or date is invalid.';
    }

    const cleanCvv = form.cvv.trim();
    if (!cleanCvv) {
      errors.cvv = 'CVV required.';
    } else if (!NigerianPaymentRails.validateCvv(cleanCvv, brand)) {
      errors.cvv = 'Invalid CVV (3-4 digits).';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      brand,
      errors,
    };
  }

  /**
   * Generates a CBN-compliant USSD payment dial string.
   */
  public static generateUssdString(
    bankCode: string,
    amountNaira: number,
    virtualAccountNumber = '9928310481'
  ): string {
    return NigerianPaymentRails.generateUssdCode(bankCode, amountNaira, virtualAccountNumber);
  }

  /**
   * Dials USSD string directly on device using tel scheme.
   */
  public static async dialUssdCode(ussdCode: string): Promise<boolean> {
    try {
      const telUrl = `tel:${encodeURIComponent(ussdCode)}`;
      const canOpen = await Linking.canOpenURL(telUrl);
      if (canOpen) {
        await Linking.openURL(telUrl);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Failed to open phone dialer for USSD:', err);
      return false;
    }
  }

  /**
   * Initializes escrow payment via backend payment provider.
   */
  public static async initializePayment(
    options: InitializePaymentOptions
  ): Promise<PaymentInitializationResult> {
    return await ApiService.initializeEscrowPayment(options);
  }

  /**
   * Confirms payment via webhook simulation / reference verification.
   */
  public static async confirmPayment(
    providerReference: string,
    amountKobo: number,
    jobId?: string
  ): Promise<{ success: boolean; isIdempotentReplay?: boolean; error?: string }> {
    return await ApiService.confirmEscrowPayment(providerReference, amountKobo, jobId);
  }

  /**
   * Submits 3D Secure OTP challenge verification.
   */
  public static async submit3DsOtp(
    providerReference: string,
    otp: string,
    jobId?: string
  ): Promise<{ success: boolean; error?: string }> {
    return await ApiService.submitCardOtp(providerReference, otp, jobId);
  }
}
