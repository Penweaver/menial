import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../../../constants/theme';
import { TopBar } from '../../../components/common/TopBar';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { ScreenFooter } from '../../../components/common/ScreenFooter';
import { useWorker } from '../../../context/WorkerContext';
import { ApiService } from '../../../services/api';
import { WorkerProfileStackParamList } from '../../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<WorkerProfileStackParamList, 'PayoutSettings'>;
};

export const WorkerPayoutSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { payoutBank, saveBankDetails, isLoading } = useWorker();

  const banks = ApiService.getSupportedBanks();
  const [selectedBankCode, setSelectedBankCode] = useState(payoutBank?.bankCode || banks[0].code);
  const [accountNumber, setAccountNumber] = useState(payoutBank?.accountNumber || '');
  const [resolvedName, setResolvedName] = useState<string | null>(payoutBank?.accountName || null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const selectedBank = banks.find((b: { code: string; name: string }) => b.code === selectedBankCode) || banks[0];

  const handleResolveAccount = async (num: string, bankCode: string) => {
    setAccountNumber(num);
    setSavedSuccess(false);
    setError(null);
    if (num.length === 10) {
      setResolving(true);
      const res = await ApiService.resolveNubanAccount(num, bankCode);
      setResolving(false);
      if (res.success && res.accountName) {
        setResolvedName(res.accountName);
      } else {
        setResolvedName(null);
        setError(res.error || 'Unable to resolve account name');
      }
    } else {
      setResolvedName(null);
    }
  };

  const handleSaveBank = async () => {
    setError(null);
    if (accountNumber.length !== 10) {
      setError('Account number must be exactly 10 digits.');
      return;
    }
    if (!resolvedName) {
      setError('Please wait for account name verification.');
      return;
    }

    const res = await saveBankDetails({
      bankCode: selectedBankCode,
      bankName: selectedBank.name,
      accountNumber,
      accountName: resolvedName,
    });

    if (res.success) {
      setSavedSuccess(true);
    } else {
      setError(res.error || 'Failed to save bank details.');
    }
  };

  return (
    <View style={styles.container}>
      <TopBar title="Bank & Payout Settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* NIP Instant Transfer Notice */}
        <View style={styles.nipNotice}>
          <Text style={styles.nipIcon}>⚡</Text>
          <View style={styles.nipInfo}>
            <Text style={styles.nipTitle}>Instant NIP Direct Disbursement</Text>
            <Text style={styles.nipDesc}>
              Earnings released upon job completion are transferred instantly to your verified Nigerian commercial bank account (§41).
            </Text>
          </View>
        </View>

        {/* Current Linked Bank Status */}
        {payoutBank && (
          <Card style={styles.currentCard}>
            <View style={styles.currentHeader}>
              <Text style={styles.currentCardTitle}>CURRENT PAYOUT ACCOUNT</Text>
              <Badge label="ACTIVE" type="verified" />
            </View>
            <Text style={styles.currentAccountName}>{payoutBank.accountName}</Text>
            <Text style={styles.currentBankName}>
              {payoutBank.bankName} • ******{payoutBank.accountNumber.slice(-4)}
            </Text>
          </Card>
        )}

        {/* Success Alert */}
        {savedSuccess && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>✓ Bank account linked successfully!</Text>
          </View>
        )}

        {/* Error Alert */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Bank Selection */}
        <Text style={styles.sectionLabel}>SELECT BANK</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bankScroll}
        >
          {banks.map((b: { code: string; name: string }) => {
            const isSelected = b.code === selectedBankCode;
            return (
              <TouchableOpacity
                key={b.code}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedBankCode(b.code);
                  if (accountNumber.length === 10) {
                    handleResolveAccount(accountNumber, b.code);
                  }
                }}
                style={[styles.bankChip, isSelected && styles.bankChipSelected]}
              >
                <Text style={[styles.bankChipText, isSelected && styles.bankChipTextSelected]}>
                  {b.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 10-Digit NUBAN Input */}
        <Input
          label="10-Digit NUBAN Account Number"
          placeholder="0123456789"
          value={accountNumber}
          onChangeText={(val) => {
            const clean = val.replace(/\D/g, '');
            handleResolveAccount(clean, selectedBankCode);
          }}
          keyboardType="numeric"
          maxLength={10}
        />

        {/* Live Resolved Account Name */}
        {resolving && (
          <Text style={styles.resolvingText}>Resolving account via NIBSS/CBN switch...</Text>
        )}

        {resolvedName && (
          <View style={styles.resolvedBox}>
            <Text style={styles.resolvedLabel}>ACCOUNT HOLDER NAME (NIBSS VERIFIED)</Text>
            <Text style={styles.resolvedNameText}>{resolvedName}</Text>
          </View>
        )}

        {/* Save Button */}
        <Button
          title="Save Bank Account"
          onPress={handleSaveBank}
          loading={isLoading}
          disabled={accountNumber.length !== 10 || !resolvedName}
          style={styles.saveBtn}
        />

        {/* Clean Standardized Screen Footer */}
        <ScreenFooter variant="compact" />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  nipNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.secondaryContainer,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nipIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  nipInfo: {
    flex: 1,
  },
  nipTitle: {
    ...Typography.scale.labelMd,
    color: Colors.secondaryText,
    fontWeight: '800',
    marginBottom: 2,
  },
  nipDesc: {
    ...Typography.scale.bodySm,
    color: Colors.secondaryText,
    lineHeight: 18,
    fontSize: 12,
  },
  currentCard: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderColor: Colors.secondary,
  },
  currentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  currentCardTitle: {
    ...Typography.scale.labelSm,
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  currentAccountName: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 2,
  },
  currentBankName: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  sectionLabel: {
    ...Typography.scale.labelSm,
    color: Colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  bankScroll: {
    gap: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  bankChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bankChipSelected: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  bankChipText: {
    ...Typography.scale.labelSm,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  bankChipTextSelected: {
    color: Colors.primary,
    fontWeight: '800',
  },
  resolvingText: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    fontSize: 12,
    marginVertical: 4,
  },
  resolvedBox: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resolvedLabel: {
    ...Typography.scale.labelSm,
    color: Colors.secondaryText,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },
  resolvedNameText: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  saveBtn: {
    marginTop: Spacing.md,
  },
  successBanner: {
    backgroundColor: Colors.secondaryContainer,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  successText: {
    ...Typography.scale.labelSm,
    color: Colors.secondaryText,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: Colors.dangerContainer,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  errorText: {
    ...Typography.scale.labelSm,
    color: Colors.dangerText,
    fontWeight: '600',
  },
});
