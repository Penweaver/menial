import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, formatKoboToNaira } from '../../constants/theme';
import { Button } from '../common/Button';
import { Card } from '../common/Card';

interface Card3DSModalProps {
  visible: boolean;
  amountKobo: number;
  cardLast4?: string;
  providerReference: string;
  onSuccess: () => void;
  onCancel: () => void;
  onSubmitOtp: (otp: string) => Promise<{ success: boolean; error?: string }>;
}

export const Card3DSModal: React.FC<Card3DSModalProps> = ({
  visible,
  amountKobo,
  cardLast4 = '4242',
  providerReference,
  onSuccess,
  onCancel,
  onSubmitOtp,
}) => {
  const [otp, setOtp] = useState<string>('123456'); // Pre-filled with sandbox OTP for testing
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(45);

  useEffect(() => {
    if (!visible) {
      setOtp('123456');
      setErrorMsg(null);
      setLoading(false);
      setCountdown(45);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [visible]);

  const handleSubmit = async () => {
    if (!otp || otp.length !== 6) {
      setErrorMsg('Please enter a 6-digit verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await onSubmitOtp(otp);
      if (res.success) {
        onSuccess();
      } else {
        setErrorMsg(res.error || 'Card authorization failed. Please check the code.');
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to authenticate payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <Card style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Text style={styles.lockIcon}>🔐</Text>
              <Text style={styles.headerTitle}>3D Secure Authentication</Text>
            </View>
            <TouchableOpacity onPress={onCancel} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Subtitle / Issuer Info */}
          <View style={styles.issuerRow}>
            <Text style={styles.issuerText}>Paystack Secure / Verified by Visa</Text>
          </View>

          {/* Amount & Merchant Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Merchant</Text>
              <Text style={styles.infoValue}>Menial Escrow Services</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Card Number</Text>
              <Text style={styles.infoValue}>•••• •••• •••• {cardLast4}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Amount Payable</Text>
              <Text style={styles.amountValue}>{formatKoboToNaira(amountKobo)}</Text>
            </View>
          </View>

          {/* OTP Input Section */}
          <View style={styles.otpSection}>
            <Text style={styles.otpPrompt}>
              Enter the 6-digit One-Time Password (OTP) sent to your registered mobile phone.
            </Text>

            {/* Sandbox Helper Hint */}
            <View style={styles.sandboxHintBadge}>
              <Text style={styles.sandboxHintText}>🧪 Sandbox Test OTP: 123456</Text>
            </View>

            <TextInput
              style={[styles.otpInput, errorMsg ? styles.otpInputError : null]}
              value={otp}
              onChangeText={(text) => {
                setOtp(text.replace(/\D/g, '').slice(0, 6));
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="000000"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
              autoFocus
            />

            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            <View style={styles.resendRow}>
              <Text style={styles.resendNotice}>
                {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Did not receive code?'}
              </Text>
              {countdown === 0 && (
                <TouchableOpacity onPress={() => setCountdown(45)}>
                  <Text style={styles.resendAction}>Resend</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionButtons}>
            <Button
              title={loading ? 'Verifying Card...' : 'Authorize Escrow Payment'}
              variant="primary"
              onPress={handleSubmit}
              disabled={loading || otp.length !== 6}
              style={styles.authBtn}
            />
            <Button
              title="Cancel Transaction"
              variant="outline"
              onPress={onCancel}
              disabled={loading}
              style={styles.cancelBtn}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  lockIcon: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  closeBtn: {
    padding: SPACING.xs,
  },
  closeText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  issuerRow: {
    marginBottom: SPACING.md,
  },
  issuerText: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.primary,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  amountValue: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '700',
    color: COLORS.primary,
  },
  otpSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  otpPrompt: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  sandboxHintBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  sandboxHintText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  otpInput: {
    width: '80%',
    height: 52,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.xs,
  },
  otpInputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.error,
    fontWeight: '600',
    marginTop: 4,
  },
  resendRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  resendNotice: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  resendAction: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  actionButtons: {
    gap: SPACING.sm,
  },
  authBtn: {
    height: 50,
  },
  cancelBtn: {
    height: 44,
  },
});
