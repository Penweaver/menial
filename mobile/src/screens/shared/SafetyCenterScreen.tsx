/**
 * Menial Mobile - Safety Center & Emergency Contacts Screen
 * 
 * Central safety hub providing:
 * - Trusted Emergency Contacts management (CRUD)
 * - 1-tap direct Nigeria emergency hotlines (112, 767, 0800-MENIAL-NG, 122)
 * - Safe SOS simulation / readiness test
 * - Menial in-person safety guarantees (§49, §63, §80)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  TextInput,
  Modal,
} from 'react-native';
import { Colors, Spacing, Radii, Typography } from '../../constants/theme';
import { TopBar } from '../../components/common/TopBar';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ScreenFooter } from '../../components/common/ScreenFooter';
import { ApiService } from '../../services/api';
import {
  EmergencyContact,
  EmergencyHotline,
  EMERGENCY_HOTLINES,
} from '@shared/services/trust/TrustSafetyService';

interface Props {
  navigation: any;
}

export const SafetyCenterScreen: React.FC<Props> = ({ navigation }) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+234');
  const [relationship, setRelationship] = useState('Spouse');
  const [testingSos, setTestingSos] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const relationships = ['Spouse', 'Parent', 'Sibling', 'Friend', 'Manager', 'Other'];

  const reloadContacts = () => {
    setContacts(ApiService.getEmergencyContacts());
  };

  useEffect(() => {
    reloadContacts();
  }, []);

  const handleSaveContact = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter the contact name.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      Alert.alert('Validation Error', 'Please enter a valid Nigerian telephone number.');
      return;
    }

    ApiService.saveEmergencyContact({
      name: name.trim(),
      phone: phone.trim(),
      relationship,
      isPrimary: contacts.length === 0,
    });

    setName('');
    setPhone('+234');
    setRelationship('Spouse');
    setModalVisible(false);
    reloadContacts();
    Alert.alert('Success', 'Emergency contact saved successfully.');
  };

  const handleDeleteContact = (contactId: string, contactName: string) => {
    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove ${contactName} from your emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            ApiService.deleteEmergencyContact(contactId);
            reloadContacts();
          },
        },
      ]
    );
  };

  const handleCallHotline = (hotline: EmergencyHotline) => {
    Alert.alert(
      `Call ${hotline.name}`,
      `Dial ${hotline.number} for immediate assistance?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'destructive',
          onPress: () => {
            Linking.openURL(`tel:${hotline.number}`).catch(() => {
              Alert.alert('Dialer Error', `Unable to dial ${hotline.number} automatically.`);
            });
          },
        },
      ]
    );
  };

  const handleTestSosAlert = () => {
    setTestingSos(true);
    setTestResult(null);

    setTimeout(() => {
      setTestingSos(false);
      const testMsg = ApiService.formatEmergencyDistressMessage({
        publicJobId: 'MNL-TEST-READINESS',
        jobTitle: 'Safety Readiness Test',
        locationText: 'Eti-Osa, Lagos State',
        latitude: 6.4380,
        longitude: 3.4280,
        reporterName: 'Authorized User',
        reporterRole: 'Marketplace Member',
        category: 'other',
        dossierRef: 'TEST-SIMULATION',
      });
      setTestResult(testMsg);
    }, 900);
  };

  return (
    <View style={styles.container}>
      <TopBar title="Safety & Emergency Command" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Rapid Command Banner */}
        <Card style={styles.commandBanner}>
          <View style={styles.bannerIconCircle}>
            <Text style={styles.bannerEmoji}>🛡️</Text>
          </View>
          <View style={styles.bannerTextGroup}>
            <Text style={styles.bannerTitle}>24/7 Rapid Incident Command</Text>
            <Text style={styles.bannerDesc}>
              Section 49 safety protocols ensure real-time protection, verified hotlines, and instant emergency alerts across all jobs.
            </Text>
          </View>
        </Card>

        {/* Section 1: Trusted Emergency Contacts */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>TRUSTED EMERGENCY CONTACTS</Text>
          <TouchableOpacity
            style={styles.addContactBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add new emergency contact"
          >
            <Text style={styles.addContactText}>+ Add Contact</Text>
          </TouchableOpacity>
        </View>

        {contacts.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No Emergency Contacts Added</Text>
            <Text style={styles.emptyDesc}>
              Add trusted family or colleagues to receive instant distress alerts with your live GPS location if you trigger SOS.
            </Text>
            <Button
              title="Add Emergency Contact"
              variant="outline"
              size="md"
              onPress={() => setModalVisible(true)}
              style={styles.emptyAddBtn}
            />
          </Card>
        ) : (
          <View style={styles.contactsList}>
            {contacts.map((contact) => (
              <Card key={contact.id} style={styles.contactCard}>
                <View style={styles.contactLeft}>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactAvatarText}>{contact.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <View style={styles.contactNameRow}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      {contact.isPrimary && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryText}>PRIMARY</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.contactDetails}>
                      {contact.relationship} · {contact.phone}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteContactBtn}
                  onPress={() => handleDeleteContact(contact.id, contact.name)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${contact.name}`}
                >
                  <Text style={styles.deleteContactText}>✕</Text>
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        )}

        {/* Section 2: Direct Emergency Hotlines */}
        <Text style={styles.sectionTitle}>DIRECT EMERGENCY HOTLINES (NIGERIA)</Text>
        <View style={styles.hotlinesGrid}>
          {EMERGENCY_HOTLINES.map((hotline) => (
            <TouchableOpacity
              key={hotline.number}
              style={styles.hotlineCard}
              onPress={() => handleCallHotline(hotline)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Call ${hotline.name}`}
            >
              <View style={styles.hotlineHeader}>
                <Text style={styles.hotlineName}>{hotline.name}</Text>
                <View style={styles.tollFreeBadge}>
                  <Text style={styles.tollFreeText}>TOLL FREE</Text>
                </View>
              </View>
              <Text style={styles.hotlineDesc}>{hotline.description}</Text>
              <View style={styles.hotlineActionRow}>
                <Text style={styles.hotlineNumber}>📞 {hotline.number}</Text>
                <Text style={styles.hotlineDialText}>Dial Now ➔</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section 3: Safe SOS Simulation / Readiness Test */}
        <Text style={styles.sectionTitle}>SOS READINESS TEST (SIMULATION)</Text>
        <Card style={styles.testCard}>
          <Text style={styles.testTitle}>Verify Distress Dispatch Readiness</Text>
          <Text style={styles.testDesc}>
            Test your device’s ability to compile live GPS distress dossiers and WhatsApp/SMS templates safely without contacting law enforcement.
          </Text>

          <Button
            title={testingSos ? 'Simulating Dispatch...' : '🧪 Run SOS Simulation Test'}
            variant="outline"
            size="md"
            onPress={handleTestSosAlert}
            loading={testingSos}
            style={styles.testBtn}
          />

          {testResult && (
            <View style={styles.testResultBox}>
              <Text style={styles.testResultHeader}>✓ READY: SIMULATED DISTRESS PAYLOAD COMPILED</Text>
              <Text style={styles.testResultContent}>{testResult}</Text>
            </View>
          )}
        </Card>

        {/* Section 4: Menial In-Person Safety Guarantees */}
        <Text style={styles.sectionTitle}>MENIAL IN-PERSON SAFETY STANDARDS (§49, §80)</Text>
        <Card style={styles.standardsCard}>
          <View style={styles.standardRow}>
            <Text style={styles.standardEmoji}>🔒</Text>
            <View style={styles.standardInfo}>
              <Text style={styles.standardTitle}>100% Escrow Protection (§39)</Text>
              <Text style={styles.standardDesc}>Funds are locked before travel; zero on-site cash disputes.</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.standardRow}>
            <Text style={styles.standardEmoji}>🛡️</Text>
            <View style={styles.standardInfo}>
              <Text style={styles.standardTitle}>NDPA NIN Masking (§80)</Text>
              <Text style={styles.standardDesc}>Identity documents are irreversibly encrypted and never shared.</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.standardRow}>
            <Text style={styles.standardEmoji}>📸</Text>
            <View style={styles.standardInfo}>
              <Text style={styles.standardTitle}>Mandatory Photo Proofs (§49)</Text>
              <Text style={styles.standardDesc}>Arrival check-in and checkout photos prevent false claims.</Text>
            </View>
          </View>
        </Card>

        <ScreenFooter variant="compact" />
      </ScrollView>

      {/* Add Emergency Contact Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Card style={styles.addModalCard}>
            <Text style={styles.addModalTitle}>Add Emergency Contact</Text>
            <Text style={styles.addModalSubtitle}>
              This contact will receive instant SMS/WhatsApp alerts with your live coordinates if you activate Emergency SOS.
            </Text>

            <Text style={styles.inputLabel}>FULL NAME</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Chioma Adebayo"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>TELEPHONE NUMBER</Text>
            <TextInput
              style={styles.textInput}
              placeholder="+234 802 345 6789"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>RELATIONSHIP</Text>
            <View style={styles.relationshipsGrid}>
              {relationships.map((rel) => {
                const isSelected = relationship === rel;
                return (
                  <TouchableOpacity
                    key={rel}
                    style={[styles.relPill, isSelected && styles.relPillSelected]}
                    onPress={() => setRelationship(rel)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.relText, isSelected && styles.relTextSelected]}>{rel}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="ghost"
                size="md"
                onPress={() => setModalVisible(false)}
                style={styles.modalCancelBtn}
              />
              <Button
                title="Save Contact"
                variant="primary"
                size="md"
                onPress={handleSaveContact}
                style={styles.modalSaveBtn}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  commandBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
    borderWidth: 1.5,
    marginBottom: Spacing.lg,
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  bannerEmoji: {
    fontSize: 22,
  },
  bannerTextGroup: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  bannerDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  addContactBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addContactText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  contactsList: {
    gap: 8,
    marginBottom: Spacing.lg,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  contactAvatarText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  contactInfo: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  primaryBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  primaryText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#15803D',
  },
  contactDetails: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  deleteContactBtn: {
    padding: 8,
  },
  deleteContactText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  emptyEmoji: {
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  emptyAddBtn: {
    minWidth: 180,
  },
  hotlinesGrid: {
    gap: 8,
    marginBottom: Spacing.lg,
  },
  hotlineCard: {
    padding: Spacing.sm,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  hotlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hotlineName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  tollFreeBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tollFreeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#B45309',
  },
  hotlineDesc: {
    fontSize: 10,
    color: '#B45309',
    marginTop: 2,
  },
  hotlineActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  hotlineNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78350F',
  },
  hotlineDialText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  testCard: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  testTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  testDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.md,
    lineHeight: 16,
  },
  testBtn: {
    width: '100%',
  },
  testResultBox: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: '#EFF6FF',
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  testResultHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 4,
  },
  testResultContent: {
    fontSize: 10,
    color: '#1E3A8A',
    fontFamily: Typography.fontFamily,
    lineHeight: 15,
  },
  standardsCard: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  standardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  standardEmoji: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  standardInfo: {
    flex: 1,
  },
  standardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  standardDesc: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  addModalCard: {
    padding: Spacing.lg,
  },
  addModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  addModalSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.md,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.canvas,
    marginBottom: Spacing.sm,
  },
  relationshipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.lg,
  },
  relPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.canvas,
  },
  relPillSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#E0F2FE',
  },
  relText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  relTextSelected: {
    color: Colors.primary,
    fontWeight: '800',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalCancelBtn: {
    minWidth: 80,
  },
  modalSaveBtn: {
    minWidth: 120,
  },
});
