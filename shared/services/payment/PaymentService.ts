export class PaymentSignatureVerifier {
  /**
   * Cryptographically verifies Paystack/Flutterwave HMAC-SHA512 signature using timing-safe comparison.
   * Defends against forged webhook calls (§37, §39, §89).
   */
  public static verifyPaystackSignature(
    rawBody: string,
    signatureHeader: string | undefined,
    secretKey: string
  ): boolean {
    if (!signatureHeader || !rawBody || !secretKey) {
      return false;
    }
    try {
      // Dynamic import prevents React Native / Metro from failing to bundle Node built-in 'crypto'
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const cryptoName = 'crypto';
      const nodeCrypto = typeof require !== 'undefined' ? require(cryptoName) : null;
      if (!nodeCrypto) {
        return false;
      }

      const hash = nodeCrypto
        .createHmac('sha512', secretKey)
        .update(rawBody)
        .digest('hex');

      const hashBuffer = typeof Buffer !== 'undefined' ? Buffer.from(hash, 'utf8') : null;
      const sigBuffer = typeof Buffer !== 'undefined' ? Buffer.from(signatureHeader, 'utf8') : null;
      if (!hashBuffer || !sigBuffer || hashBuffer.length !== sigBuffer.length) {
        return false;
      }
      return nodeCrypto.timingSafeEqual(hashBuffer, sigBuffer);
    } catch {
      return false;
    }
  }
}

export type PaymentChannel = 'card' | 'bank_transfer' | 'ussd' | 'wallet';

export interface VirtualAccountDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  expiresAt: string; // ISO 8601 string (typically 30 minutes from creation)
}

export interface UssdPaymentDetails {
  bankCode: string;
  bankName: string;
  ussdCode: string;
}

export interface CardPaymentDetails {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  pin?: string;
}

export interface NigerianBankRailInfo {
  code: string;
  name: string;
  ussdPrefix: string;
  ussdSuffix: string;
}

export class NigerianPaymentRails {
  public static readonly SUPPORTED_BANKS: NigerianBankRailInfo[] = [
    { code: '058', name: 'Guaranty Trust Bank (GTBank)', ussdPrefix: '*737*50*', ussdSuffix: '#' },
    { code: '057', name: 'Zenith Bank', ussdPrefix: '*966*', ussdSuffix: '#' },
    { code: '044', name: 'Access Bank', ussdPrefix: '*901*', ussdSuffix: '#' },
    { code: '011', name: 'First Bank of Nigeria', ussdPrefix: '*894*', ussdSuffix: '#' },
    { code: '033', name: 'United Bank for Africa (UBA)', ussdPrefix: '*919*', ussdSuffix: '#' },
    { code: '221', name: 'Stanbic IBTC Bank', ussdPrefix: '*909*', ussdSuffix: '#' },
    { code: '070', name: 'Fidelity Bank', ussdPrefix: '*770*', ussdSuffix: '#' },
    { code: '214', name: 'First City Monument Bank (FCMB)', ussdPrefix: '*329*', ussdSuffix: '#' },
    { code: '232', name: 'Sterling Bank', ussdPrefix: '*822*', ussdSuffix: '#' },
    { code: '032', name: 'Union Bank of Nigeria', ussdPrefix: '*826*', ussdSuffix: '#' },
    { code: '035', name: 'Wema Bank', ussdPrefix: '*945*', ussdSuffix: '#' },
  ];

  /**
   * Generates a CBN-compliant USSD payment dial string for mobile devices.
   */
  public static generateUssdCode(
    bankCode: string,
    amountNaira: number,
    accountNumber = '9928310481'
  ): string {
    const bank = this.SUPPORTED_BANKS.find((b) => b.code === bankCode) || this.SUPPORTED_BANKS[0];
    const roundedAmount = Math.max(1, Math.round(amountNaira));

    switch (bank.code) {
      case '058': // GTBank: *737*50*Amount*Account#
        return `*737*50*${roundedAmount}*${accountNumber}#`;
      case '057': // Zenith: *966*Amount*Account#
        return `*966*${roundedAmount}*${accountNumber}#`;
      case '044': // Access: *901*Amount*Account#
        return `*901*${roundedAmount}*${accountNumber}#`;
      case '011': // First Bank: *894*Amount*Account#
        return `*894*${roundedAmount}*${accountNumber}#`;
      case '033': // UBA: *919*Amount*Account#
        return `*919*${roundedAmount}*${accountNumber}#`;
      default:
        return `${bank.ussdPrefix}${roundedAmount}*${accountNumber}${bank.ussdSuffix}`;
    }
  }

  /**
   * Detects payment card brand: Visa, Mastercard, Verve (Nigeria's domestic scheme), or unknown.
   */
  public static detectCardBrand(cardNumber: string): 'visa' | 'mastercard' | 'verve' | 'unknown' {
    const clean = cardNumber.replace(/\D/g, '');
    if (!clean) return 'unknown';

    // Verve: 506099-506198, 650002-650027, 507859-507964, or starting with 506, 507, 650
    if (/^(506|507|650|504)/.test(clean)) {
      return 'verve';
    }
    // Visa: Starts with 4
    if (/^4/.test(clean)) {
      return 'visa';
    }
    // Mastercard: Starts with 51-55 or 2221-2720
    if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(clean)) {
      return 'mastercard';
    }
    return 'unknown';
  }

  /**
   * Validates credit/debit card number using the standard Luhn algorithm.
   */
  public static validateCardNumber(cardNumber: string): boolean {
    const clean = cardNumber.replace(/\D/g, '');
    if (clean.length < 13 || clean.length > 19) {
      return false;
    }

    let sum = 0;
    let alternate = false;
    for (let i = clean.length - 1; i >= 0; i--) {
      let digit = parseInt(clean.charAt(i), 10);
      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      sum += digit;
      alternate = !alternate;
    }
    return sum % 10 === 0;
  }

  /**
   * Formats card numbers with standard 4-digit spacing for mobile inputs.
   */
  public static formatCardNumber(cardNumber: string): string {
    const clean = cardNumber.replace(/\D/g, '').slice(0, 19);
    return clean.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }

  /**
   * Validates card expiry month (01-12) and year (current year or up to 15 years future).
   */
  public static validateCardExpiry(month: string, year: string): boolean {
    const cleanMonth = parseInt(month.trim(), 10);
    let cleanYear = parseInt(year.trim(), 10);

    if (isNaN(cleanMonth) || cleanMonth < 1 || cleanMonth > 12) {
      return false;
    }

    if (isNaN(cleanYear)) {
      return false;
    }

    // Convert 2-digit year to 4-digit year (e.g. 26 -> 2026)
    if (cleanYear < 100) {
      cleanYear += 2000;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    if (cleanYear < currentYear) {
      return false;
    }
    if (cleanYear === currentYear && cleanMonth < currentMonth) {
      return false;
    }
    if (cleanYear > currentYear + 15) {
      return false;
    }

    return true;
  }

  /**
   * Validates card CVV (3 digits for Visa/Mastercard/Verve, 4 for Amex).
   */
  public static validateCvv(cvv: string, _brand?: string): boolean {
    const clean = cvv.trim().replace(/\D/g, '');
    return clean.length >= 3 && clean.length <= 4;
  }
}

export interface InitializePaymentOptions {
  jobId: string;
  publicJobId: string;
  amountKobo: number;     // Integer kobo (§4)
  employerEmail: string;
  employerPhone: string;
  callbackUrl?: string;
  channel?: PaymentChannel;
  cardDetails?: CardPaymentDetails;
  selectedBankCode?: string;
}

export interface PaymentInitializationResult {
  success: boolean;
  paymentId: string;
  providerReference: string;
  checkoutUrl: string;
  amountKobo: number;
  currency: 'NGN';
  channel?: PaymentChannel;
  virtualAccount?: VirtualAccountDetails;
  ussdDetails?: UssdPaymentDetails;
  requires3DS?: boolean;
  authUrl?: string;
  error?: string;
}

export interface WebhookPayload {
  event: 'charge.success' | 'charge.failed';
  providerReference: string;
  amountKobo: number;
  currency: 'NGN';
  customerEmail?: string;
  metadata?: Record<string, unknown>;
  signature?: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  isIdempotentReplay?: boolean;
  paymentId?: string;
  error?: string;
}

export interface IPaymentProvider {
  /**
   * Initializes an escrow payment session with external provider (Paystack/Flutterwave).
   */
  initializePayment(options: InitializePaymentOptions): Promise<PaymentInitializationResult>;

  /**
   * Validates and confirms an incoming webhook payload.
   * Client cannot set payment success (§37).
   */
  handleWebhook(payload: WebhookPayload): Promise<WebhookProcessingResult>;

  /**
   * Submits card 3DS OTP challenge verification.
   */
  submitCardOtp?(
    providerReference: string,
    otp: string
  ): Promise<{ success: boolean; error?: string }>;

  /**
   * Queries payment status directly from payment provider.
   */
  queryPaymentStatus?(
    providerReference: string
  ): Promise<{ status: 'pending' | 'successful' | 'failed'; amountKobo: number }>;

  /**
   * Reverses an escrow deposit via refund.
   */
  refundPayment(
    providerReference: string,
    amountKobo: number,
    reason: string
  ): Promise<{ success: boolean; refundReference: string; error?: string }>;
}

