import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, formatKoboToNaira } from '../../../constants/theme';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { TopBar } from '../../../components/common/TopBar';
import {
  ApiService,
  WorkerEarningsSummary,
  MockLedgerEntry,
  SUPPORTED_NIGERIAN_BANKS,
} from '../../../services/api';

export const WorkerWalletScreen: React.FC = () => {
  const [summary, setSummary] = useState<WorkerEarningsSummary>({
    availableBalanceKobo: 0,
    pendingEscrowKobo: 0,
    lifetimeEarningsKobo: 0,
    totalWithdrawnKobo: 0,
  });
  const [transactions, setTransactions] = useState<MockLedgerEntry[]>([]);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState<boolean>(false);
  const [selectedBankCode, setSelectedBankCode] = useState<string>('044'); // Access Bank default
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [resolvingAccount, setResolvingAccount] = useState<boolean>(false);
  const [withdrawAmountNaira, setWithdrawAmountNaira] = useState<string>('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState<boolean>(false);
  const [withdrawSuccessRef, setWithdrawSuccessRef] = useState<string | null>(null);

  const loadWalletData = useCallback(() => {
    const s = ApiService.getWorkerEarningsSummary('worker_adebayo');
    setSummary(s);
    const txs = ApiService.getLedgerTransactions('worker_adebayo');
    setTransactions(txs);
  }, []);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  // Handle live NUBAN resolution when 10 digits are entered
  const handleAccountNumberChange = async (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setAccountNumber(cleaned);

    if (cleaned.length === 10) {
      setResolvingAccount(true);
      try {
        const res = await ApiService.validateNuban(cleaned, selectedBankCode);
        if (res.valid && res.accountName) {
          setAccountName(res.accountName);
        } else {
          setAccountName('');
          Alert.alert('Account Verification', res.error || 'Could not verify account.');
        }
      } catch (err) {
        setAccountName('');
      } finally {
        setResolvingAccount(false);
      }
    } else {
      setAccountName('');
    }
  };

  const handleBankChange = async (bankCode: string) => {
    setSelectedBankCode(bankCode);
    if (accountNumber.length === 10) {
      setResolvingAccount(true);
      try {
        const res = await ApiService.validateNuban(accountNumber, bankCode);
        if (res.valid && res.accountName) {
          setAccountName(res.accountName);
        } else {
          setAccountName('');
        }
      } finally {
        setResolvingAccount(false);
      }
    }
  };

  const handleWithdrawMax = () => {
    const maxNaira = Math.floor(summary.availableBalanceKobo / 100);
    setWithdrawAmountNaira(maxNaira.toString());
  };

  const handleConfirmWithdrawal = async () => {
    const nairaNum = parseFloat(withdrawAmountNaira);
    if (isNaN(nairaNum) || nairaNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }

    const amountKobo = Math.round(nairaNum * 100);
    if (amountKobo > summary.availableBalanceKobo) {
      Alert.alert(
        'Insufficient Balance',
        `You cannot withdraw more than your available balance (${formatKoboToNaira(summary.availableBalanceKobo)}).`
      );
      return;
    }

    if (accountNumber.length !== 10) {
      Alert.alert('Invalid Account', 'Nigerian NUBAN account numbers must be exactly 10 digits.');
      return;
    }

    setSubmittingWithdraw(true);
    try {
      const res = await ApiService.withdrawEarnings({
        workerId: 'worker_adebayo',
        amountKobo,
        bankAccount: {
          accountNumber,
          bankCode: selectedBankCode,
          accountName: accountName || 'VERIFIED WORKER HOLDER',
        },
      });

      if (res.success) {
        setWithdrawSuccessRef(res.providerReference);
        loadWalletData();
      } else {
        Alert.alert('Payout Failed', res.error || 'Failed to process bank transfer.');
      }
    } catch (err) {
      Alert.alert('Payout Error', (err as Error).message || 'Failed to process withdrawal.');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const closeWithdrawModal = () => {
    setWithdrawModalVisible(false);
    setWithdrawSuccessRef(null);
    setWithdrawAmountNaira('');
    setAccountNumber('');
    setAccountName('');
  };

  return (
    <View style={styles.screen}>
      <TopBar title="Earnings & Wallet" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Electric Royal Cobalt Balance Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>AVAILABLE BALANCE</Text>
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTagText}>NIP Instant Payout</Text>
            </View>
          </View>

          <Text style={styles.heroBalance}>
            {formatKoboToNaira(summary.availableBalanceKobo)}
          </Text>

          <View style={styles.heroDivider} />

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Pending Escrow</Text>
              <Text style={styles.metricValue}>
                {formatKoboToNaira(summary.pendingEscrowKobo)}
              </Text>
            </View>
            <View style={styles.metricDividerVertical} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Lifetime Earnings</Text>
              <Text style={styles.metricValue}>
                {formatKoboToNaira(summary.lifetimeEarningsKobo)}
              </Text>
            </View>
            <View style={styles.metricDividerVertical} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total Paid Out</Text>
              <Text style={styles.metricValue}>
                {formatKoboToNaira(summary.totalWithdrawnKobo)}
              </Text>
            </View>
          </View>
        </View>

        {/* Primary Action Button */}
        <Button
          title="Withdraw to Bank Account"
          variant="kinetic"
          onPress={() => setWithdrawModalVisible(true)}
          style={styles.withdrawMainBtn}
          disabled={summary.availableBalanceKobo <= 0}
        />

        {/* Security & Speed Value Props (§41, §44) */}
        <View style={styles.trustGrid}>
          <View style={styles.trustItem}>
            <Text style={styles.trustEmoji}>⚡</Text>
            <View style={styles.trustTextGroup}>
              <Text style={styles.trustTitle}>Sub-60s NIP Transfer</Text>
              <Text style={styles.trustDesc}>Disbursed instantly to any Nigerian commercial bank</Text>
            </View>
          </View>
          <View style={styles.trustItem}>
            <Text style={styles.trustEmoji}>🔒</Text>
            <View style={styles.trustTextGroup}>
              <Text style={styles.trustTitle}>Double-Entry Ledger</Text>
              <Text style={styles.trustDesc}>Immutable audit trail protects every kobo of your wage</Text>
            </View>
          </View>
        </View>

        {/* Transaction History & Audit Ledger */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          <Badge label={`${transactions.length} ENTRIES`} type="neutral" />
        </View>

        {transactions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📜</Text>
            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
            <Text style={styles.emptySubtitle}>
              When you complete jobs or withdraw earnings, your ledger records will appear here.
            </Text>
          </Card>
        ) : (
          transactions.map((tx) => {
            const isCredit = tx.amountKobo > 0;
            return (
              <Card key={tx.id} style={styles.txCard}>
                <View style={styles.txRow}>
                  <View style={[styles.txIconCircle, isCredit ? styles.iconCredit : styles.iconDebit]}>
                    <Text style={styles.txArrowText}>{isCredit ? '↓' : '↑'}</Text>
                  </View>
                  <View style={styles.txDetails}>
                    <Text style={styles.txTitle}>{tx.description}</Text>
                    <Text style={styles.txDate}>
                      {new Date(tx.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })} · Ref: {tx.relatedId}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, isCredit ? styles.amountCredit : styles.amountDebit]}>
                    {isCredit ? '+' : '-'}{formatKoboToNaira(Math.abs(tx.amountKobo))}
                  </Text>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Withdrawal Modal */}
      <Modal
        visible={withdrawModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeWithdrawModal}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            {withdrawSuccessRef ? (
              <View style={styles.successBox}>
                <View style={styles.successIconCircle}>
                  <Text style={styles.successEmoji}>💸</Text>
                </View>
                <Text style={styles.successTitle}>Withdrawal Dispatched!</Text>
                <Text style={styles.successSubtitle}>
                  Your funds have been disbursed via Nigerian Inter-Bank Settlement System (NIP).
                </Text>
                <View style={styles.refCard}>
                  <Text style={styles.refLabel}>NIP TRANSACTION REFERENCE</Text>
                  <Text style={styles.refValue}>{withdrawSuccessRef}</Text>
                  <Text style={styles.refNotice}>Destination: {accountName || 'Bank Account'} · {accountNumber}</Text>
                </View>
                <Button
                  title="Done"
                  variant="primary"
                  onPress={closeWithdrawModal}
                  style={styles.actionBtn}
                />
              </View>
            ) : (
              <View>
                <View style={styles.modalHeaderRow}>
                  <View>
                    <Text style={styles.modalTitle}>Withdraw to Bank</Text>
                    <Text style={styles.modalSubtitle}>
                      Available: {formatKoboToNaira(summary.availableBalanceKobo)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={closeWithdrawModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.closeIcon}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Bank Selector */}
                <Text style={styles.inputLabel}>SELECT DESTINATION BANK</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bankPillsScroll}>
                  {SUPPORTED_NIGERIAN_BANKS.map((b) => {
                    const isSelected = selectedBankCode === b.code;
                    return (
                      <TouchableOpacity
                        key={b.code}
                        style={[styles.bankPill, isSelected && styles.bankPillSelected]}
                        onPress={() => handleBankChange(b.code)}
                      >
                        <Text style={[styles.bankPillText, isSelected && styles.bankPillTextSelected]}>
                          {b.name.split('(')[0].trim()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* 10-digit NUBAN Input */}
                <Text style={styles.inputLabel}>10-DIGIT NUBAN ACCOUNT NUMBER</Text>
                <View style={styles.inputWithLoader}>
                  <TextInput
                    style={styles.textInput}
                    value={accountNumber}
                    onChangeText={handleAccountNumberChange}
                    placeholder="e.g. 0123456789"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                  {resolvingAccount && (
                    <ActivityIndicator size="small" color={COLORS.primary} style={styles.loaderInside} />
                  )}
                </View>

                {accountName ? (
                  <View style={styles.verifiedAccountPill}>
                    <Text style={styles.verifiedAccountText}>✓ {accountName}</Text>
                  </View>
                ) : null}

                {/* Amount to Withdraw */}
                <View style={styles.amountLabelRow}>
                  <Text style={styles.inputLabel}>AMOUNT TO WITHDRAW (₦)</Text>
                  <TouchableOpacity onPress={handleWithdrawMax}>
                    <Text style={styles.withdrawMaxText}>Withdraw Max</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.textInput}
                  value={withdrawAmountNaira}
                  onChangeText={setWithdrawAmountNaira}
                  placeholder="₦ Amount in Naira"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric"
                />

                <Button
                  title={submittingWithdraw ? 'Disbursing Transfer...' : 'Confirm & Disburse Payout'}
                  variant="kinetic"
                  onPress={handleConfirmWithdrawal}
                  loading={submittingWithdraw}
                  disabled={!accountNumber || accountNumber.length !== 10 || !withdrawAmountNaira}
                  style={styles.actionBtn}
                />
              </View>
            )}
          </Card>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  heroCard: {
    backgroundColor: COLORS.primary, // Electric Royal Cobalt #1A4FEE
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  heroLabel: {
    ...TYPOGRAPHY.scale.labelSm,
    color: '#A7F3D0', // Mint Jade light
    letterSpacing: 1,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  liveTagText: {
    ...TYPOGRAPHY.scale.labelSm,
    color: '#FFFFFF',
    fontSize: 10,
  },
  heroBalance: {
    ...TYPOGRAPHY.scale.currencyDisplay,
    color: '#FFFFFF',
    marginBottom: SPACING.md,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: SPACING.md,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    ...TYPOGRAPHY.scale.labelSm,
    color: '#94A3B8',
    fontSize: 10,
    marginBottom: 2,
  },
  metricValue: {
    ...TYPOGRAPHY.scale.labelMd,
    color: '#FFFFFF',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  metricDividerVertical: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  withdrawMainBtn: {
    height: 52,
    marginBottom: SPACING.lg,
  },
  trustGrid: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustEmoji: {
    fontSize: 22,
    marginRight: SPACING.sm,
  },
  trustTextGroup: {
    flex: 1,
  },
  trustTitle: {
    ...TYPOGRAPHY.scale.labelMd,
    color: COLORS.textPrimary,
  },
  trustDesc: {
    ...TYPOGRAPHY.scale.bodySm,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.scale.headlineSm,
    color: COLORS.textPrimary,
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    ...TYPOGRAPHY.scale.labelLg,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.scale.bodySm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  txCard: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  iconCredit: {
    backgroundColor: '#ECFDF5',
  },
  iconDebit: {
    backgroundColor: '#FEF3C7',
  },
  txArrowText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  txDetails: {
    flex: 1,
  },
  txTitle: {
    ...TYPOGRAPHY.scale.labelMd,
    color: COLORS.textPrimary,
  },
  txDate: {
    ...TYPOGRAPHY.scale.bodySm,
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    ...TYPOGRAPHY.scale.labelLg,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  amountCredit: {
    color: '#065F46', // Mint green
  },
  amountDebit: {
    color: '#92400E', // Amber brown
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.scale.headlineSm,
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    ...TYPOGRAPHY.scale.bodySm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeIcon: {
    fontSize: 20,
    color: COLORS.textSecondary,
    padding: SPACING.xs,
  },
  inputLabel: {
    ...TYPOGRAPHY.scale.labelSm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    letterSpacing: 0.5,
  },
  bankPillsScroll: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  bankPill: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginRight: SPACING.xs,
  },
  bankPillSelected: {
    backgroundColor: COLORS.primaryContainer,
    borderColor: COLORS.primary,
  },
  bankPillText: {
    ...TYPOGRAPHY.scale.labelSm,
    color: COLORS.textSecondary,
  },
  bankPillTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  inputWithLoader: {
    position: 'relative',
    marginBottom: SPACING.xs,
  },
  textInput: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...TYPOGRAPHY.scale.bodyMd,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  loaderInside: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  verifiedAccountPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  verifiedAccountText: {
    ...TYPOGRAPHY.scale.labelSm,
    color: '#065F46',
    fontWeight: '700',
  },
  amountLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  withdrawMaxText: {
    ...TYPOGRAPHY.scale.labelSm,
    color: COLORS.primary,
    fontWeight: '700',
  },
  actionBtn: {
    height: 52,
    marginTop: SPACING.sm,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  successEmoji: {
    fontSize: 32,
  },
  successTitle: {
    ...TYPOGRAPHY.scale.headlineSm,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  successSubtitle: {
    ...TYPOGRAPHY.scale.bodyMd,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  refCard: {
    backgroundColor: COLORS.canvas,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  refLabel: {
    ...TYPOGRAPHY.scale.labelSm,
    color: COLORS.textSecondary,
    fontSize: 10,
    marginBottom: 4,
  },
  refValue: {
    ...TYPOGRAPHY.scale.labelMd,
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  refNotice: {
    ...TYPOGRAPHY.scale.bodySm,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
});
