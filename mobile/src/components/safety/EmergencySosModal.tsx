/**
 * Menial Mobile - Section 49 Emergency SOS Modal
 * 
 * High-speed, fail-safe emergency response system:
 * - 5 standardized emergency incident categories
 * - 3-second abort countdown with instant dispatch override
 * - Silent (stealth) mode for discreet security distress
 * - 1-tap direct Nigeria emergency hotlines (112, 767, 0800-MENIAL-NG)
 * - Emergency contacts distress broadcast with live GPS link
 * - Deterrent visual alarm beacon mode
 * - Non-silent audit logged resolution ("I Am Now Safe")
 * 
 * Reference: menial-master-spec-v2.md (§49, §63)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Share,
  Linking,
  ScrollView,
  Switch,
  Animated,
} from 'react-native';
import { Colors, Spacing, Radii, Typography, TYPOGRAPHY } from '../../constants/theme';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { ApiService } from '../../services/api';
import { LocationService, NotificationService } from '../../services/hardware';
import {
  EmergencyIncidentCategory,
  EMERGENCY_HOTLINES,
  EmergencySosDossier,
} from '@shared/services/trust/TrustSafetyService';

export interface EmergencySosModalProps {
  visible: boolean;
  onClose: () => void;
  jobId: string;
  publicJobId: string;
  jobTitle: string;
  locationText: string;
  counterpartyName: string;
  counterpartyRole: 'Employer' | 'Worker';
  initialCategory?: EmergencyIncidentCategory;
}

interface IncidentOption {
  key: EmergencyIncidentCategory;
  label: string;
  emoji: string;
  description: string;
}

const INCIDENT_CATEGORIES: IncidentOption[] = [
  {
    key: 'physical_threat',
    label: 'Physical Threat',
    emoji: '🚨',
    description: 'Immediate violence, intimidation, assault, or weapon threat',
  },
  {
    key: 'medical_emergency',
    label: 'Medical Emergency',
    emoji: '🚑',
    description: 'Sudden illness, collapse, severe injury, or trauma',
  },
  {
    key: 'harassment',
    label: 'Harassment / Hostile',
    emoji: '⚠️',
    description: 'Verbal aggression, extortion, or unsafe site situation',
  },
  {
    key: 'safety_hazard',
    label: 'Site Hazard',
    emoji: '🩹',
    description: 'Structural danger, fire, electrocution, or toxic hazard',
  },
  {
    key: 'other',
    label: 'Other Urgent Crisis',
    emoji: '🆘',
    description: 'General critical situation requiring security intervention',
  },
];

export const EmergencySosModal: React.FC<EmergencySosModalProps> = ({
  visible,
  onClose,
  jobId,
  publicJobId,
  jobTitle,
  locationText,
  counterpartyName,
  counterpartyRole,
  initialCategory = 'physical_threat',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<EmergencyIncidentCategory>(initialCategory);
  const [isSilent, setIsSilent] = useState<boolean>(false);
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [deviceCoords, setDeviceCoords] = useState<{ latitude: number; longitude: number; addressText?: string } | null>(null);

  // Countdown state: null = not started, number = 3..1
  const [countdown, setCountdown] = useState<number | null>(null);
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [dispatchedDossier, setDispatchedDossier] = useState<EmergencySosDossier | null>(null);
  const [resolving, setResolving] = useState<boolean>(false);

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const strobeAnim = useRef(new Animated.Value(0)).current;

  // Fetch live GPS coordinates when modal opens
  useEffect(() => {
    if (visible) {
      LocationService.getCurrentLocation()
        .then((loc) => {
          setDeviceCoords(loc);
        })
        .catch((err) => {
          console.warn('[EmergencySosModal] Location acquisition error:', err);
        });
    }
  }, [visible]);

  // Check if an SOS is already active for this job when modal opens
  useEffect(() => {
    if (visible && jobId) {
      const activeSos = ApiService.getActiveSosForJob(jobId);
      if (activeSos && activeSos.status !== 'resolved') {
        setDispatchedDossier(activeSos);
        setSelectedCategory(activeSos.category);
        setIsSilent(activeSos.isSilent);
      }
    }
  }, [visible, jobId]);

  // Handle countdown effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (countdown === 0) {
      // Countdown finished -> execute dispatch
      setCountdown(null);
      executeDispatch();
    }

    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [countdown]);

  // Flashing strobe visual alarm effect
  useEffect(() => {
    if (isAlarmActive) {
      const strobeLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(strobeAnim, { toValue: 1, duration: 250, useNativeDriver: false }),
          Animated.timing(strobeAnim, { toValue: 0, duration: 250, useNativeDriver: false }),
        ])
      );
      strobeLoop.start();
      return () => strobeLoop.stop();
    } else {
      strobeAnim.setValue(0);
    }
  }, [isAlarmActive, strobeAnim]);

  // Clean abort of countdown
  const handleAbortCountdown = () => {
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
    }
    setCountdown(null);
  };

  // Immediate dispatch initiation
  const handleStartCountdown = () => {
    setCountdown(3);
  };

  // Execute actual API dispatch
  const executeDispatch = async () => {
    setDispatching(true);
    try {
      const lat = deviceCoords?.latitude ?? 6.4380;
      const lng = deviceCoords?.longitude ?? 3.4280;
      const effectiveLocation = deviceCoords?.addressText || locationText;

      const res = await ApiService.triggerEmergencySos({
        jobId,
        publicJobId,
        category: selectedCategory,
        description: `Section 49 Emergency SOS (${selectedCategory.toUpperCase()}) triggered on job ${publicJobId} (${jobTitle}) at ${effectiveLocation}. Counterparty: ${counterpartyRole} ${counterpartyName}`,
        locationText: effectiveLocation,
        latitude: lat,
        longitude: lng,
        isSilent,
        batteryLevel: 88,
        emergencyContactsNotified: false,
        reporterRole: counterpartyRole === 'Worker' ? 'employer' : 'worker',
      });

      const dossier = ApiService.getSosReport(res.reportId);
      if (dossier) {
        setDispatchedDossier(dossier);
      } else {
        setDispatchedDossier({
          reportId: res.reportId,
          jobId,
          publicJobId,
          category: selectedCategory,
          description: `Emergency SOS triggered on ${publicJobId}`,
          locationText: effectiveLocation,
          latitude: lat,
          longitude: lng,
          isSilent,
          batteryLevel: 88,
          status: 'dispatched',
          createdAt: new Date().toISOString(),
          hotlines: ['112', '767', '080063642564'],
          emergencyContactsNotified: false,
        });
      }

      // Non-silent local notification alert
      if (!isSilent) {
        await NotificationService.sendLocalNotification(
          '🚨 EMERGENCY SOS DISPATCHED',
          `Incident ref: ${res.reportId}. HQ Command & Emergency Services notified at ${effectiveLocation}`
        );
      }
    } catch (err) {
      Alert.alert('Dispatch Error', (err as Error).message || 'Failed to dispatch SOS alert.');
    } finally {
      setDispatching(false);
    }
  };

  // Hotline Direct Dialer
  const handleCallHotline = (number: string, name: string) => {
    Alert.alert(
      `Call ${name}`,
      `Connect directly with ${name} (${number})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dial Now',
          style: 'destructive',
          onPress: () => {
            Linking.openURL(`tel:${number}`).catch(() => {
              Alert.alert('Dialer Error', `Unable to open phone dialer for ${number}. Please dial manually.`);
            });
          },
        },
      ]
    );
  };

  // Emergency Contacts Broadcast
  const handleBroadcastEmergencyContacts = async () => {
    try {
      const lat = dispatchedDossier?.latitude || deviceCoords?.latitude || 6.4380;
      const lng = dispatchedDossier?.longitude || deviceCoords?.longitude || 3.4280;
      const locText = dispatchedDossier?.locationText || deviceCoords?.addressText || locationText;

      const message = ApiService.formatEmergencyDistressMessage({
        publicJobId,
        jobTitle,
        locationText: locText,
        latitude: lat,
        longitude: lng,
        reporterName: counterpartyRole === 'Worker' ? 'Employer' : 'Worker',
        reporterRole: counterpartyRole === 'Worker' ? 'Employer' : 'Worker',
        category: selectedCategory,
        dossierRef: dispatchedDossier?.reportId || 'SOS-ACTIVE',
      });

      await Share.share({
        message,
        title: `🚨 MENIAL EMERGENCY ALERT: ${publicJobId}`,
      });

      if (dispatchedDossier) {
        dispatchedDossier.emergencyContactsNotified = true;
      }
    } catch (err) {
      console.log('Share dismissed or failed:', err);
    }
  };

  // Non-Silent Resolution Flow
  const handleResolveSos = () => {
    Alert.alert(
      'Confirm Safety Resolution',
      'Are you safe and out of immediate danger? Resolving this will log an audit note and clear the active emergency alert for this job.',
      [
        { text: 'Not Safe Yet', style: 'cancel' },
        {
          text: 'I Am Safe (Resolve)',
          style: 'default',
          onPress: async () => {
            if (!dispatchedDossier) {
              onClose();
              return;
            }
            setResolving(true);
            try {
              await ApiService.resolveEmergencySos(
                dispatchedDossier.reportId,
                'Distress resolved by user confirmation. User self-reported safe and clear of hazard.'
              );
              setDispatchedDossier(null);
              setIsAlarmActive(false);
              onClose();
            } catch (err) {
              Alert.alert('Resolution Error', (err as Error).message || 'Failed to update safety report.');
            } finally {
              setResolving(false);
            }
          },
        },
      ]
    );
  };

  const strobeBackgroundColor = strobeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#7F1D1D', '#EF4444'],
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Card style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* COUNTDOWN STATE */}
            {countdown !== null ? (
              <View style={styles.countdownContainer}>
                <View style={styles.countdownCircle}>
                  <Text style={styles.countdownNumber}>{countdown}</Text>
                </View>
                <Text style={styles.countdownTitle}>DISPATCHING EMERGENCY SOS</Text>
                <Text style={styles.countdownSubtitle}>
                  Rapid response units and Menial Lagos HQ command will be immediately mobilized.
                </Text>

                <View style={styles.countdownBtnGroup}>
                  <Button
                    title="⛔ ABORT / CANCEL"
                    variant="secondary"
                    size="lg"
                    onPress={handleAbortCountdown}
                    style={styles.abortBtn}
                  />
                  <Button
                    title="⚡ DISPATCH IMMEDIATELY"
                    variant="danger"
                    size="lg"
                    onPress={() => {
                      handleAbortCountdown();
                      executeDispatch();
                    }}
                    style={styles.instantDispatchBtn}
                  />
                </View>
              </View>
            ) : dispatchedDossier ? (
              /* POST-DISPATCH STATE (LIVE DOSSIER & ACTIONS) */
              <View style={styles.dispatchedContent}>
                {isAlarmActive ? (
                  <Animated.View style={[styles.alarmBanner, { backgroundColor: strobeBackgroundColor }]}>
                    <Text style={styles.alarmBannerText}>🚨 DETERRENT VISUAL ALARM ACTIVE 🚨</Text>
                  </Animated.View>
                ) : null}

                <View style={styles.sosAlertCircle}>
                  <Text style={styles.sosEmoji}>🚨</Text>
                </View>

                <Text style={styles.dispatchedTitle}>Emergency Dispatched!</Text>
                <Text style={styles.dispatchedDesc}>
                  A critical safety alert has been routed directly to the Menial Lagos Incident Command and emergency services.
                </Text>

                {/* Dossier Badge */}
                <View style={styles.reportBadge}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.reportLabel}>INCIDENT DOSSIER REF</Text>
                    <View style={styles.liveStatusPill}>
                      <Text style={styles.liveStatusText}>🔴 DISPATCHED</Text>
                    </View>
                  </View>
                  <Text style={styles.reportRef}>{dispatchedDossier.reportId}</Text>
                  <Text style={styles.reportMeta}>
                    Category: {dispatchedDossier.category.replace(/_/g, ' ').toUpperCase()} · Job: {publicJobId}
                  </Text>
                </View>

                {/* 1-Tap Emergency Hotlines (Nigeria) */}
                <Text style={styles.sectionHeader}>DIRECT NIGERIA EMERGENCY HOTLINES</Text>
                <View style={styles.hotlinesContainer}>
                  <TouchableOpacity
                    style={styles.hotlineRowBtn}
                    onPress={() => handleCallHotline('112', 'National Emergency (112)')}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Call 112 National Emergency"
                  >
                    <Text style={styles.hotlineEmoji}>👮</Text>
                    <View style={styles.hotlineInfo}>
                      <Text style={styles.hotlineName}>National Emergency (Police / Ambulance)</Text>
                      <Text style={styles.hotlineSub}>Dial 112 · Toll Free Nationwide</Text>
                    </View>
                    <Text style={styles.callBadge}>CALL 112</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.hotlineRowBtn}
                    onPress={() => handleCallHotline('767', 'Lagos Emergency Command (767)')}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Call 767 Lagos State Emergency"
                  >
                    <Text style={styles.hotlineEmoji}>🚒</Text>
                    <View style={styles.hotlineInfo}>
                      <Text style={styles.hotlineName}>Lagos Emergency Command (LASEMA)</Text>
                      <Text style={styles.hotlineSub}>Dial 767 · 24/7 Lagos State Command</Text>
                    </View>
                    <Text style={styles.callBadge}>CALL 767</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.hotlineRowBtn}
                    onPress={() => handleCallHotline('080063642564', 'Menial Lagos Ops HQ')}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Call Menial Rapid Response Center"
                  >
                    <Text style={styles.hotlineEmoji}>🛡️</Text>
                    <View style={styles.hotlineInfo}>
                      <Text style={styles.hotlineName}>Menial Rapid Ops Command</Text>
                      <Text style={styles.hotlineSub}>0800-MENIAL-NG · Toll Free Operations</Text>
                    </View>
                    <Text style={styles.callBadge}>CALL HQ</Text>
                  </TouchableOpacity>
                </View>

                {/* Secondary Actions */}
                <View style={styles.actionsBox}>
                  <Button
                    title="📲 Alert Emergency Contacts (SMS/WhatsApp)"
                    variant="outline"
                    size="md"
                    onPress={handleBroadcastEmergencyContacts}
                    style={styles.modalBtn}
                  />

                  {!isSilent && (
                    <Button
                      title={isAlarmActive ? '🔇 Silence Deterrent Strobe' : '🔊 Trigger Visual Deterrent Beacon'}
                      variant={isAlarmActive ? 'secondary' : 'danger-outline'}
                      size="md"
                      onPress={() => setIsAlarmActive(!isAlarmActive)}
                      style={styles.modalBtn}
                    />
                  )}

                  <Button
                    title={resolving ? 'Resolving Incident...' : '✓ I Am Now Safe (Resolve SOS)'}
                    variant="primary"
                    size="lg"
                    onPress={handleResolveSos}
                    disabled={resolving}
                    style={styles.resolveBtn}
                  />
                </View>
              </View>
            ) : (
              /* PRE-DISPATCH STATE (CATEGORY & INITIATION) */
              <View style={styles.sosContent}>
                <View style={styles.dangerCircle}>
                  <Text style={styles.dangerExclamation}>⚠️</Text>
                </View>
                <Text style={styles.sosTitle}>Section 49 Emergency SOS</Text>
                <Text style={styles.sosSubtitle}>
                  If you feel unsafe or in danger, select the incident nature below and trigger an immediate response alert.
                </Text>

                {/* Category Selection */}
                <Text style={styles.categoryHeading}>SELECT INCIDENT CATEGORY</Text>
                <View style={styles.categoryGrid}>
                  {INCIDENT_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.key;
                    return (
                      <TouchableOpacity
                        key={cat.key}
                        style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                        onPress={() => setSelectedCategory(cat.key)}
                        activeOpacity={0.7}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text style={styles.catEmoji}>{cat.emoji}</Text>
                        <Text style={[styles.catLabel, isSelected && styles.catLabelSelected]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Location Snapshot */}
                <View style={styles.locationSnapshot}>
                  <Text style={styles.locLabel}>LIVE DISPATCH LOCATION</Text>
                  <Text style={styles.locText}>📍 {deviceCoords?.addressText || locationText}</Text>
                  <Text style={styles.locSub}>
                    GPS: {(deviceCoords?.latitude ?? 6.4380).toFixed(4)}° N, {(deviceCoords?.longitude ?? 3.4280).toFixed(4)}° E · Ref: {publicJobId} · {counterpartyRole}: {counterpartyName}
                  </Text>
                </View>

                {/* Stealth / Silent Mode Toggle */}
                <View style={styles.stealthRow}>
                  <View style={styles.stealthTextGroup}>
                    <Text style={styles.stealthTitle}>Discreet Stealth Mode</Text>
                    <Text style={styles.stealthDesc}>
                      Dispatch alert silently without sound or visual notifications.
                    </Text>
                  </View>
                  <Switch
                    value={isSilent}
                    onValueChange={setIsSilent}
                    trackColor={{ false: Colors.border, true: Colors.danger }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Dispatch Button */}
                <Button
                  title={dispatching ? 'Mobilizing Alert...' : '🚨 Trigger Emergency SOS'}
                  variant="danger"
                  size="lg"
                  onPress={handleStartCountdown}
                  disabled={dispatching}
                  style={styles.sosTriggerBtn}
                />

                <Button
                  title="📲 Share Live Location (WhatsApp / SMS)"
                  variant="outline"
                  size="md"
                  onPress={handleBroadcastEmergencyContacts}
                  style={styles.modalBtn}
                />

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss Emergency SOS dialog"
                >
                  <Text style={styles.cancelText}>Dismiss & Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxHeight: '92%',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
  },
  scrollContent: {
    paddingBottom: Spacing.md,
  },
  sosContent: {
    alignItems: 'center',
  },
  dispatchedContent: {
    alignItems: 'center',
  },
  dangerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  dangerExclamation: {
    fontSize: 28,
  },
  sosAlertCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  sosEmoji: {
    fontSize: 28,
  },
  sosTitle: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: '800',
    color: Colors.danger,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  sosSubtitle: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  categoryHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    alignSelf: 'flex-start',
    marginBottom: Spacing.xs,
  },
  categoryGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  categoryCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.canvas,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  categoryCardSelected: {
    borderColor: Colors.danger,
    backgroundColor: '#FEF2F2',
  },
  catEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  catLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  catLabelSelected: {
    color: Colors.danger,
    fontWeight: '800',
  },
  locationSnapshot: {
    width: '100%',
    backgroundColor: Colors.canvas,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  locLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  locText: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  locSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  stealthRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  stealthTextGroup: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  stealthTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  stealthDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  sosTriggerBtn: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  modalBtn: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  resolveBtn: {
    width: '100%',
    marginTop: Spacing.xs,
  },
  cancelBtn: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  cancelText: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  // Countdown styles
  countdownContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  countdownCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  countdownNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  countdownTitle: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: '900',
    color: Colors.danger,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  countdownSubtitle: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  countdownBtnGroup: {
    width: '100%',
    gap: 12,
  },
  abortBtn: {
    width: '100%',
  },
  instantDispatchBtn: {
    width: '100%',
  },
  // Dispatched styles
  dispatchedTitle: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  dispatchedDesc: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  alarmBanner: {
    width: '100%',
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  alarmBannerText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  reportBadge: {
    backgroundColor: '#EFF6FF',
    padding: Spacing.md,
    borderRadius: Radii.md,
    width: '100%',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: Spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reportLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  liveStatusPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  liveStatusText: {
    color: '#DC2626',
    fontSize: 9,
    fontWeight: '800',
  },
  reportRef: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '800',
    color: '#1E40AF',
  },
  reportMeta: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
    fontWeight: '500',
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    alignSelf: 'flex-start',
    marginBottom: Spacing.xs,
  },
  hotlinesContainer: {
    width: '100%',
    gap: 8,
    marginBottom: Spacing.md,
  },
  hotlineRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    minHeight: 52,
  },
  hotlineEmoji: {
    fontSize: 22,
    marginRight: Spacing.sm,
  },
  hotlineInfo: {
    flex: 1,
  },
  hotlineName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  hotlineSub: {
    fontSize: 10,
    color: '#B45309',
    marginTop: 1,
  },
  callBadge: {
    backgroundColor: '#D97706',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionsBox: {
    width: '100%',
  },
});
