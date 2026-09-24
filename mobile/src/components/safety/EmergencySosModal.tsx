import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { ApiService } from '../../services/api';

interface EmergencySosModalProps {
  visible: boolean;
  onClose: () => void;
  jobId: string;
  publicJobId: string;
  jobTitle: string;
  locationText: string;
  counterpartyName: string;
  counterpartyRole: 'Employer' | 'Worker';
}

export const EmergencySosModal: React.FC<EmergencySosModalProps> = ({
  visible,
  onClose,
  jobId,
  publicJobId,
  jobTitle,
  locationText,
  counterpartyName,
  counterpartyRole,
}) => {
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [dispatched, setDispatched] = useState<boolean>(false);
  const [reportId, setReportId] = useState<string>('');

  const handleTriggerSos = async () => {
    setDispatching(true);
    try {
      const res = await ApiService.triggerEmergencySos({
        jobId,
        description: `Emergency SOS triggered on active job ${publicJobId} (${jobTitle}) at ${locationText}. Counterparty: ${counterpartyName}`,
        locationText,
        latitude: 6.4380,
        longitude: 3.4280,
      });

      setReportId(res.reportId);
      setDispatched(true);
    } catch (err) {
      Alert.alert('Dispatch Error', (err as Error).message || 'Failed to dispatch SOS alert.');
    } finally {
      setDispatching(false);
    }
  };

  const handleShareSafetyDetails = async () => {
    try {
      const shareData = ApiService.generateJobShareDetails({
        publicJobId,
        jobTitle,
        locationText,
        scheduledTime: 'Active On-Site',
        counterpartyName,
        counterpartyRole,
      });

      await Share.share({
        message: shareData.shareText,
        title: `Menial Safety Alert: ${publicJobId}`,
      });
    } catch (err) {
      console.log('Share dismissed or failed:', err);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Card style={styles.modalCard}>
          {dispatched ? (
            <View style={styles.dispatchedContent}>
              <View style={styles.sosAlertCircle}>
                <Text style={styles.sosEmoji}>🚨</Text>
              </View>
              <Text style={styles.dispatchedTitle}>Emergency Dispatched!</Text>
              <Text style={styles.dispatchedDesc}>
                A high-priority safety incident has been registered with the Menial Rapid Response Team.
              </Text>

              <View style={styles.reportBadge}>
                <Text style={styles.reportLabel}>INCIDENT DOSSIER REF</Text>
                <Text style={styles.reportRef}>{reportId}</Text>
              </View>

              <View style={styles.hotlinesCard}>
                <Text style={styles.hotlineTitle}>Emergency Hotlines (Nigeria):</Text>
                <Text style={styles.hotlineText}>📞 Toll-Free Emergency: 112</Text>
                <Text style={styles.hotlineText}>📞 Lagos State Emergency Management: 767</Text>
                <Text style={styles.hotlineText}>📞 Menial Trust & Safety: +234 1 800 MENIAL</Text>
              </View>

              <Button
                title="Share Location to Contacts"
                variant="outline"
                onPress={handleShareSafetyDetails}
                style={styles.modalBtn}
              />

              <Button
                title="I Am Now Safe (Close)"
                variant="primary"
                onPress={() => {
                  setDispatched(false);
                  onClose();
                }}
                style={styles.modalBtn}
              />
            </View>
          ) : (
            <View style={styles.sosContent}>
              <View style={styles.dangerCircle}>
                <Text style={styles.dangerExclamation}>⚠️</Text>
              </View>
              <Text style={styles.sosTitle}>Section 49 Emergency SOS</Text>
              <Text style={styles.sosSubtitle}>
                If you feel unsafe or in danger, tap below to immediately alert the Menial Safety Team and get emergency assistance.
              </Text>

              <View style={styles.locationSnapshot}>
                <Text style={styles.locLabel}>CURRENT JOB LOCATION</Text>
                <Text style={styles.locText}>📍 {locationText}</Text>
                <Text style={styles.locSub}>Ref: {publicJobId} · {counterpartyRole}: {counterpartyName}</Text>
              </View>

              <Button
                title={dispatching ? 'Dispatching Alert...' : '🚨 Trigger Emergency SOS'}
                variant="danger"
                onPress={handleTriggerSos}
                disabled={dispatching}
                style={styles.sosTriggerBtn}
              />

              <Button
                title="📲 Share Live Location (WhatsApp / SMS)"
                variant="outline"
                onPress={handleShareSafetyDetails}
                style={styles.modalBtn}
              />

              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },
  sosContent: {
    alignItems: 'center',
  },
  dispatchedContent: {
    alignItems: 'center',
  },
  dangerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  dangerExclamation: {
    fontSize: 30,
  },
  sosAlertCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  sosEmoji: {
    fontSize: 30,
  },
  sosTitle: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: '800',
    color: COLORS.danger,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  sosSubtitle: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  dispatchedTitle: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  dispatchedDesc: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  locationSnapshot: {
    width: '100%',
    backgroundColor: COLORS.canvas,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  locLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  locText: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  locSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  reportBadge: {
    backgroundColor: '#ECFDF5',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: SPACING.md,
  },
  reportLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  reportRef: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '800',
    color: '#065F46',
    marginTop: 2,
  },
  hotlinesCard: {
    width: '100%',
    backgroundColor: '#FFFBEB',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: SPACING.md,
    gap: 4,
  },
  hotlineTitle: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  hotlineText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
  },
  sosTriggerBtn: {
    width: '100%',
    height: 52,
    marginBottom: SPACING.sm,
  },
  modalBtn: {
    width: '100%',
    height: 48,
    marginBottom: SPACING.sm,
  },
  cancelBtn: {
    paddingVertical: SPACING.sm,
  },
  cancelText: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});
