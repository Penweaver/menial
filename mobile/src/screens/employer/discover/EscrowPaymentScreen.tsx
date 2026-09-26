import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { EmployerDiscoverStackParamList } from '../../../navigation/types';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, formatKoboToNaira } from '../../../constants/theme';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { TopBar } from '../../../components/common/TopBar';
import { ApiService } from '../../../services/api';
import { MobilePaymentService } from '../../../services/payment/MobilePaymentService';
import { Card3DSModal } from '../../../components/payment/Card3DSModal';
import type { VirtualAccountDetails, UssdPaymentDetails } from '@shared/services/payment/PaymentService';

type RouteProps = RouteProp<EmployerDiscoverStackParamList, 'EscrowPayment'>;
type NavProp = NativeStackNavigationProp<EmployerDiscoverStackParamList, 'EscrowPayment'>;

type PaymentMethod = 'transfer' | 'card' | 'ussd' | 'wallet';

export const EscrowPaymentScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProp>();

  const {
    jobId,
    publicJobId = 'MNL-2026-8921',
    workerId,
    workerName,
    jobTitle,
    workerPayKobo,
    workerCount = 1,
    platformFeeKobo = Math.round(workerPayKobo * workerCount * 0.1),
    totalEscrowKobo = (workerPayKobo * workerCount) + platformFeeKobo,
  } = route.params;

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('transfer');
  const [processing, setProcessing] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [paymentReference, setPaymentReference] = useState<string>('');

  // 1. Virtual Account State (§38)
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccountDetails | null>(null);
  const [vaCountdown, setVaCountdown] = useState<number>(1800); // 30 minutes in seconds
  const [accountCopied, setAccountCopied] = useState<boolean>(false);

  // 2. Card Details State (§37, §39)
  const [cardNumber, setCardNumber] = useState<string>('4084 0841 1234 4242');
  const [cardExpiry, setCardExpiry] = useState<string>('12/28');
  const [cardCvv, setCardCvv] = useState<string>('881');
  const [cardHolder, setCardHolder] = useState<string>('ADEBISI JOHNSON');
  const [card3DSVisible, setCard3DSVisible] = useState<boolean>(false);
  const [cardErrors, setCardErrors] = useState<{ [key: string]: string }>({});

  // 3. USSD State
  const supportedBanks = MobilePaymentService.getSupportedBanks();
  const [selectedBankCode, setSelectedBankCode] = useState<string>('058'); // GTBank
  const [ussdDetails, setUssdDetails] = useState<UssdPaymentDetails | null>(null);

  // 4. Wallet State
  const employerWalletBalanceKobo = 4500000; // ₦45,000 available

  // Auto-initialize Virtual Account upon selection or mount
  useEffect(() => {
    let isMounted = true;
    const initTransferSession = async () => {
      try {
        const res = await ApiService.initializeEscrowPayment({
          jobId,
          publicJobId,
          amountKobo: totalEscrowKobo,
          employerEmail: 'employer@menial.ng',
          employerPhone: '+2348098765432',
          channel: 'bank_transfer',
        });
        if (isMounted && res.success && res.virtualAccount) {
          setVirtualAccount(res.virtualAccount);
          setPaymentReference(res.providerReference);
        }
      } catch (err) {
        console.warn('Virtual account initialization error:', err);
      }
    };

    initTransferSession();
    return () => {
      isMounted = false;
    };
  }, [jobId, publicJobId, totalEscrowKobo]);

  // Virtual account expiration countdown
  useEffect(() => {
    if (!virtualAccount) return;
    const interval = setInterval(() => {
      setVaCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [virtualAccount]);

  // Format countdown mm:ss
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Card brand detection
  const detectedBrand = MobilePaymentService.detectCardBrand(cardNumber);

  // Handle Card Payment Trigger
  const handleInitiateCardPayment = async () => {
    // Validate card form
    const validation = MobilePaymentService.validateCardForm({
      cardNumber,
      expiry: cardExpiry,
      cvv: cardCvv,
      cardholderName: cardHolder,
      saveCard: true,
    });

    if (!validation.isValid) {
      setCardErrors(validation.errors as { [key: string]: string });
      return;
    }
    setCardErrors({});
    setProcessing(true);

    try {
      const [expMonth, expYear] = cardExpiry.split('/');
      const initResult = await ApiService.initializeEscrowPayment({
        jobId,
        publicJobId,
        amountKobo: totalEscrowKobo,
        employerEmail: 'employer@menial.ng',
        employerPhone: '+2348098765432',
        channel: 'card',
        cardDetails: {
          cardNumber: cardNumber.replace(/\s+/g, ''),
          expiryMonth: expMonth,
          expiryYear: expYear,
          cvv: cardCvv,
        },
      });

      if (!initResult.success) {
        throw new Error(initResult.error || 'Failed to initialize card payment.');
      }

      setPaymentReference(initResult.providerReference);

      if (initResult.requires3DS) {
        setProcessing(false);
        setCard3DSVisible(true);
      } else {
        // Direct charge success
        const confirmResult = await ApiService.confirmEscrowPayment(
          initResult.providerReference,
          totalEscrowKobo,
          jobId
        );
        if (!confirmResult.success) {
          throw new Error(confirmResult.error || 'Payment confirmation failed');
        }
        setProcessing(false);
        setPaymentSuccess(true);
      }
    } catch (err) {
      setProcessing(false);
      Alert.alert('Payment Error', (err as Error).message || 'Failed to authorize card payment.');
    }
  };

  // Handle Bank Transfer Confirmation
  const handleConfirmBankTransfer = async () => {
    setProcessing(true);
    try {
      const ref = paymentReference || `mock_ref_${publicJobId}_transfer`;
      const confirmResult = await ApiService.confirmEscrowPayment(
        ref,
        totalEscrowKobo,
        jobId
      );

      if (!confirmResult.success) {
        throw new Error(confirmResult.error || 'Payment transfer could not be confirmed.');
      }

      setPaymentSuccess(true);
    } catch (err) {
      Alert.alert('Transfer Verification', (err as Error).message || 'Payment not yet received.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle USSD Dial & Confirm
  const handleDialUssd = async () => {
    const amountNaira = totalEscrowKobo / 100;
    const ussdString = MobilePaymentService.generateUssdString(
      selectedBankCode,
      amountNaira,
      virtualAccount?.accountNumber || '9928310481'
    );
    await MobilePaymentService.dialUssdCode(ussdString);
  };

  const handleConfirmUssdPayment = async () => {
    setProcessing(true);
    try {
      const ref = paymentReference || `mock_ref_${publicJobId}_ussd`;
      const confirmResult = await ApiService.confirmEscrowPayment(
        ref,
        totalEscrowKobo,
        jobId
      );
      if (!confirmResult.success) {
        throw new Error(confirmResult.error || 'USSD payment verification failed.');
      }
      setPaymentSuccess(true);
    } catch (err) {
      Alert.alert('USSD Verification', (err as Error).message || 'Payment not yet completed.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Wallet Payment
  const handleWalletPayment = async () => {
    if (employerWalletBalanceKobo < totalEscrowKobo) {
      Alert.alert(
        'Insufficient Balance',
        `Your Menial wallet balance (${formatKoboToNaira(employerWalletBalanceKobo)}) is less than the required escrow (${formatKoboToNaira(totalEscrowKobo)}).`
      );
      return;
    }

    setProcessing(true);
    try {
      const ref = `mock_ref_${publicJobId}_wallet`;
      setPaymentReference(ref);
      const confirmResult = await ApiService.confirmEscrowPayment(
        ref,
        totalEscrowKobo,
        jobId
      );
      if (!confirmResult.success) {
        throw new Error(confirmResult.error || 'Wallet payment deduction failed.');
      }
      setPaymentSuccess(true);
    } catch (err) {
      Alert.alert('Wallet Error', (err as Error).message || 'Failed to pay from wallet.');
    } finally {
      setProcessing(false);
    }
  };

  // Copy Account Number
  const handleCopyAccountNumber = () => {
    setAccountCopied(true);
    setTimeout(() => setAccountCopied(false), 3000);
    Alert.alert('Copied', 'Virtual bank account number copied to clipboard.');
  };

  return (
    <View style={styles.container}>
      <TopBar
        title="Pay & Security"
        onBack={() => navigation.goBack()}
        rightAction={<Text style={styles.stepIndicator}>Step 6 of 7</Text>}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Job Summary Snapshot Card per Stitch */}
        <Card style={styles.snapshotCard}>
          <View style={styles.snapshotTop}>
            <View style={styles.categoryIconBox}>
              <Text style={styles.categoryEmoji}>🚚</Text>
            </View>
            <View style={styles.snapshotTitles}>
              <Text style={styles.categoryLabel}>JOB SUMMARY</Text>
              <Text style={styles.snapshotJobTitle}>{jobTitle}</Text>
            </View>
            <View style={styles.urgentPill}>
              <Text style={styles.urgentText}>⚡ Protected</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.snapshotDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📍</Text>
              <Text style={styles.detailText}>Plot 14, Admiralty Way, Lekki Phase 1, Lagos</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>👤</Text>
              <Text style={styles.detailText}>Assigned Artisan: <Text style={styles.boldText}>{workerName}</Text></Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>👥</Text>
              <Text style={styles.detailText}>{workerCount} Worker needed · Job Ref: {publicJobId}</Text>
            </View>
          </View>
        </Card>

        {/* 2. Escrow Guarantee Callout per Stitch */}
        <View style={styles.escrowCallout}>
          <Text style={styles.escrowShield}>🛡️</Text>
          <View style={styles.escrowCalloutContent}>
            <Text style={styles.escrowCalloutTitle}>menial Escrow Protection</Text>
            <Text style={styles.escrowCalloutText}>
              Payment is held securely by Menial. Your money is only released to {workerName} after you inspect and confirm the job is completed satisfactorily.
            </Text>
          </View>
        </View>

        {/* 3. Financial Fee Breakdown Card */}
        <Card style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>FEE BREAKDOWN</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Worker Total ({workerCount} worker)</Text>
            <Text style={styles.breakdownValue}>
              {formatKoboToNaira(workerPayKobo * workerCount)}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <View style={styles.platformFeeLabelRow}>
              <Text style={styles.breakdownLabel}>Menial Platform & Insurance Fee</Text>
              <View style={styles.trustShieldPill}>
                <Text style={styles.trustShieldText}>TrustShield</Text>
              </View>
            </View>
            <Text style={styles.breakdownValue}>
              {formatKoboToNaira(platformFeeKobo)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalAmount}>
              {formatKoboToNaira(totalEscrowKobo)}
            </Text>
          </View>
        </Card>

        {/* 4. Payment Method Selector per Nigerian Rails */}
        <Card style={styles.paymentMethodsCard}>
          <View style={styles.paymentMethodHeader}>
            <Text style={styles.sectionHeaderTitle}>Select Payment Method</Text>
            <Text style={styles.encryptedNotice}>🔒 256-bit Encrypted</Text>
          </View>

          {/* Option 1: Instant Bank Transfer */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              selectedMethod === 'transfer' && styles.methodCardSelected,
            ]}
            onPress={() => setSelectedMethod('transfer')}
            activeOpacity={0.8}
          >
            <View style={styles.methodLeft}>
              <View style={styles.methodIconBox}>
                <Text style={styles.methodIcon}>🏦</Text>
              </View>
              <View>
                <View style={styles.methodTitleRow}>
                  <Text style={styles.methodTitle}>Instant Bank Transfer</Text>
                  <View style={styles.fastestPill}>
                    <Text style={styles.fastestText}>Fastest</Text>
                  </View>
                </View>
                <Text style={styles.methodSubtitle}>Dedicated Dynamic Virtual Account</Text>
              </View>
            </View>
            <View style={[styles.radioCircle, selectedMethod === 'transfer' && styles.radioCircleSelected]}>
              {selectedMethod === 'transfer' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          {/* Transfer Details Expanded Card */}
          {selectedMethod === 'transfer' && (
            <View style={styles.transferDetailsContainer}>
              <View style={styles.transferHeaderRow}>
                <Text style={styles.transferNotice}>
                  Transfer exactly <Text style={styles.boldPrimary}>{formatKoboToNaira(totalEscrowKobo)}</Text> to the dedicated account below:
                </Text>
                <View style={styles.timerBadge}>
                  <Text style={styles.timerText}>⏳ {formatTimer(vaCountdown)}</Text>
                </View>
              </View>

              <View style={styles.virtualAccountBox}>
                <View style={styles.vaRow}>
                  <Text style={styles.vaLabel}>Bank Name</Text>
                  <Text style={styles.vaValue}>{virtualAccount?.bankName || 'Wema Bank'}</Text>
                </View>
                <View style={styles.vaRow}>
                  <Text style={styles.vaLabel}>Account Number</Text>
                  <View style={styles.accountNumberActionRow}>
                    <Text style={styles.vaAccountNumber}>
                      {virtualAccount?.accountNumber || '9928310481'}
                    </Text>
                    <TouchableOpacity
                      style={styles.copyBtn}
                      onPress={handleCopyAccountNumber}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.copyBtnText}>
                        {accountCopied ? '✓ Copied' : 'Copy'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.vaRow}>
                  <Text style={styles.vaLabel}>Account Name</Text>
                  <Text style={styles.vaValueSmall}>
                    {virtualAccount?.accountName || `Menial Escrow / ${publicJobId}`}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Option 2: Debit Card */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              selectedMethod === 'card' && styles.methodCardSelected,
            ]}
            onPress={() => setSelectedMethod('card')}
            activeOpacity={0.8}
          >
            <View style={styles.methodLeft}>
              <View style={styles.methodIconBox}>
                <Text style={styles.methodIcon}>💳</Text>
              </View>
              <View>
                <Text style={styles.methodTitle}>Debit Card</Text>
                <Text style={styles.methodSubtitle}>Mastercard, Visa, or Verve via Paystack</Text>
              </View>
            </View>
            <View style={[styles.radioCircle, selectedMethod === 'card' && styles.radioCircleSelected]}>
              {selectedMethod === 'card' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          {/* Card Form Expanded Fields */}
          {selectedMethod === 'card' && (
            <View style={styles.cardFormContainer}>
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.inputLabel}>CARD NUMBER</Text>
                  {detectedBrand !== 'unknown' && (
                    <View style={styles.brandBadge}>
                      <Text style={styles.brandBadgeText}>{detectedBrand.toUpperCase()}</Text>
                    </View>
                  )}
                </View>
                <TextInput
                  style={[styles.textInput, cardErrors.cardNumber ? styles.inputError : null]}
                  value={cardNumber}
                  onChangeText={(text) => setCardNumber(MobilePaymentService.formatCardNumber(text))}
                  placeholder="0000 0000 0000 0000"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  maxLength={23}
                />
                {cardErrors.cardNumber && <Text style={styles.fieldError}>{cardErrors.cardNumber}</Text>}
              </View>

              <View style={styles.cardRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>EXPIRY</Text>
                  <TextInput
                    style={[styles.textInput, cardErrors.expiry ? styles.inputError : null]}
                    value={cardExpiry}
                    onChangeText={(text) => setCardExpiry(MobilePaymentService.formatExpiry(text))}
                    placeholder="MM/YY"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                  {cardErrors.expiry && <Text style={styles.fieldError}>{cardErrors.expiry}</Text>}
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <TextInput
                    style={[styles.textInput, cardErrors.cvv ? styles.inputError : null]}
                    value={cardCvv}
                    onChangeText={(text) => setCardCvv(text.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                  />
                  {cardErrors.cvv && <Text style={styles.fieldError}>{cardErrors.cvv}</Text>}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CARDHOLDER NAME</Text>
                <TextInput
                  style={styles.textInput}
                  value={cardHolder}
                  onChangeText={setCardHolder}
                  placeholder="Full name as on card"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          )}

          {/* Option 3: USSD Banking */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              selectedMethod === 'ussd' && styles.methodCardSelected,
            ]}
            onPress={() => setSelectedMethod('ussd')}
            activeOpacity={0.8}
          >
            <View style={styles.methodLeft}>
              <View style={styles.methodIconBox}>
                <Text style={styles.methodIcon}>📱</Text>
              </View>
              <View>
                <Text style={styles.methodTitle}>USSD Bank Code</Text>
                <Text style={styles.methodSubtitle}>Dial *737#, *966#, *901# from any phone</Text>
              </View>
            </View>
            <View style={[styles.radioCircle, selectedMethod === 'ussd' && styles.radioCircleSelected]}>
              {selectedMethod === 'ussd' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          {/* USSD Details Expanded Card */}
          {selectedMethod === 'ussd' && (
            <View style={styles.ussdDetailsContainer}>
              <Text style={styles.inputLabel}>SELECT YOUR BANK</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bankChipScroll}>
                {supportedBanks.map((b) => (
                  <TouchableOpacity
                    key={b.code}
                    style={[
                      styles.bankChip,
                      selectedBankCode === b.code && styles.bankChipSelected,
                    ]}
                    onPress={() => setSelectedBankCode(b.code)}
                  >
                    <Text
                      style={[
                        styles.bankChipText,
                        selectedBankCode === b.code && styles.bankChipTextSelected,
                      ]}
                    >
                      {b.name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.ussdCodeBox}>
                <Text style={styles.ussdCodeLabel}>DIAL STRING</Text>
                <Text style={styles.ussdDialString}>
                  {MobilePaymentService.generateUssdString(
                    selectedBankCode,
                    totalEscrowKobo / 100,
                    virtualAccount?.accountNumber || '9928310481'
                  )}
                </Text>
                <TouchableOpacity
                  style={styles.dialUssdBtn}
                  onPress={handleDialUssd}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dialUssdBtnText}>📞 Tap to Dial USSD Code</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Option 4: Menial Wallet Balance */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              selectedMethod === 'wallet' && styles.methodCardSelected,
            ]}
            onPress={() => setSelectedMethod('wallet')}
            activeOpacity={0.8}
          >
            <View style={styles.methodLeft}>
              <View style={styles.methodIconBox}>
                <Text style={styles.methodIcon}>👛</Text>
              </View>
              <View>
                <Text style={styles.methodTitle}>menial Wallet Balance</Text>
                <Text style={styles.walletBalanceText}>
                  {formatKoboToNaira(employerWalletBalanceKobo)} available
                </Text>
              </View>
            </View>
            <View style={[styles.radioCircle, selectedMethod === 'wallet' && styles.radioCircleSelected]}>
              {selectedMethod === 'wallet' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        </Card>

        {/* 5. Institutional Trust Badges */}
        <View style={styles.trustBadgesRow}>
          <View style={styles.trustBadgeCard}>
            <Text style={styles.trustBadgeIcon}>📜</Text>
            <Text style={styles.trustBadgeTitle}>NDPA Compliant</Text>
          </View>
          <View style={styles.trustBadgeCard}>
            <Text style={styles.trustBadgeIcon}>🔐</Text>
            <Text style={styles.trustBadgeTitle}>Bank Grade Security</Text>
          </View>
          <View style={styles.trustBadgeCard}>
            <Text style={styles.trustBadgeIcon}>🤝</Text>
            <Text style={styles.trustBadgeTitle}>100% Escrow Guarantee</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Shelf with Action CTA */}
      <View style={styles.bottomShelf}>
        {selectedMethod === 'card' && (
          <Button
            title={processing ? 'Processing Card...' : `Authorize & Secure ${formatKoboToNaira(totalEscrowKobo)}`}
            variant="primary"
            onPress={handleInitiateCardPayment}
            disabled={processing}
            style={styles.payBtn}
          />
        )}

        {selectedMethod === 'transfer' && (
          <Button
            title={processing ? 'Verifying Transfer...' : 'I Have Sent The Money'}
            variant="primary"
            onPress={handleConfirmBankTransfer}
            disabled={processing}
            style={styles.payBtn}
          />
        )}

        {selectedMethod === 'ussd' && (
          <Button
            title={processing ? 'Verifying USSD...' : "I've Completed USSD Payment"}
            variant="primary"
            onPress={handleConfirmUssdPayment}
            disabled={processing}
            style={styles.payBtn}
          />
        )}

        {selectedMethod === 'wallet' && (
          <Button
            title={processing ? 'Authorizing Wallet...' : `Pay ${formatKoboToNaira(totalEscrowKobo)} from Wallet`}
            variant="primary"
            onPress={handleWalletPayment}
            disabled={processing}
            style={styles.payBtn}
          />
        )}

        <Text style={styles.cancelPolicyNotice}>
          ✓ Free cancellation until worker arrives at job location
        </Text>
      </View>

      {/* 3D Secure Authentication Modal */}
      <Card3DSModal
        visible={card3DSVisible}
        amountKobo={totalEscrowKobo}
        cardLast4={cardNumber.replace(/\s+/g, '').slice(-4) || '4242'}
        providerReference={paymentReference}
        onCancel={() => setCard3DSVisible(false)}
        onSubmitOtp={async (otp) => {
          return await MobilePaymentService.submit3DsOtp(paymentReference, otp, jobId);
        }}
        onSuccess={() => {
          setCard3DSVisible(false);
          setPaymentSuccess(true);
        }}
      />

      {/* Payment Success Modal */}
      <Modal visible={paymentSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <View style={styles.successIconCircle}>
              <Text style={styles.successEmoji}>🎉</Text>
            </View>
            <Text style={styles.successTitle}>Escrow Secured!</Text>
            <Text style={styles.successAmount}>{formatKoboToNaira(totalEscrowKobo)}</Text>
            <Text style={styles.successDesc}>
              Funds have been securely locked in escrow with Paystack.
              {'\n\n'}
              <Text style={styles.boldText}>{workerName}</Text> has been notified and scheduled for your job.
            </Text>

            <View style={styles.refBox}>
              <Text style={styles.refLabel}>ESCROW REFERENCE</Text>
              <Text style={styles.refValue}>{paymentReference || 'MOCK_REF_SECURED'}</Text>
            </View>

            <Button
              title="Return to Discovery Feed"
              variant="primary"
              onPress={() => {
                setPaymentSuccess(false);
                navigation.navigate('WorkerDiscovery');
              }}
              style={styles.modalBtn}
            />
          </Card>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  stepIndicator: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.secondary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 140,
    gap: SPACING.md,
  },
  snapshotCard: {
    padding: SPACING.md,
  },
  snapshotTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  categoryIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: {
    fontSize: 20,
  },
  snapshotTitles: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  snapshotJobTitle: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  urgentPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  urgentText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.sm,
  },
  snapshotDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailIcon: {
    fontSize: 14,
  },
  detailText: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
    flex: 1,
  },
  boldText: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  escrowCallout: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  escrowShield: {
    fontSize: 24,
  },
  escrowCalloutContent: {
    flex: 1,
  },
  escrowCalloutTitle: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 2,
  },
  escrowCalloutText: {
    fontSize: 12,
    color: '#15803D',
    lineHeight: 17,
  },
  breakdownCard: {
    padding: SPACING.md,
  },
  breakdownTitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
  },
  breakdownValue: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  platformFeeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustShieldPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  trustShieldText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  paymentMethodsCard: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionHeaderTitle: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  encryptedNotice: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  methodCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F8FAFC',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  methodIconBox: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIcon: {
    fontSize: 18,
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  methodTitle: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  fastestPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  fastestText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  methodSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  walletBalanceText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  transferDetailsContainer: {
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  transferHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transferNotice: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  boldPrimary: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  timerBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  timerText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '700',
  },
  virtualAccountBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  vaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  vaLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  vaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  vaValueSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  accountNumberActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  vaAccountNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  copyBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  copyBtnText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  cardFormContainer: {
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  brandBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  brandBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primary,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.surface,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  fieldError: {
    fontSize: 10,
    color: COLORS.error,
    fontWeight: '600',
  },
  ussdDetailsContainer: {
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  bankChipScroll: {
    marginVertical: 4,
  },
  bankChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginRight: 6,
  },
  bankChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  bankChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  bankChipTextSelected: {
    color: '#FFF',
  },
  ussdCodeBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  ussdCodeLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ussdDialString: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginVertical: 4,
    letterSpacing: 1,
  },
  dialUssdBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  dialUssdBtnText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
  },
  trustBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  trustBadgeCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  trustBadgeIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  trustBadgeTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  bottomShelf: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: SPACING.xs,
  },
  payBtn: {
    height: 52,
  },
  cancelPolicyNotice: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    padding: SPACING.xl,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  successEmoji: {
    fontSize: 32,
  },
  successTitle: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  successAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
    marginVertical: SPACING.xs,
  },
  successDesc: {
    fontSize: TYPOGRAPHY.body.fontSize,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  refBox: {
    backgroundColor: COLORS.canvas,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.lg,
  },
  refLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  refValue: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
  },
  modalBtn: {
    width: '100%',
    height: 52,
  },
});
