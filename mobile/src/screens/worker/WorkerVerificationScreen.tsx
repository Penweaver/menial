import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Colors, Typography, Spacing, Radii, Layout } from '../../constants/theme';
import { TopBar } from '../../components/common/TopBar';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useWorker } from '../../context/WorkerContext';
import { MediaService } from '../../services/hardware';

type DocumentType = 'nin' | 'voters_card' | 'drivers_license' | 'international_passport';

interface WorkerVerificationScreenProps {
  onSuccess?: () => void;
  onBack?: () => void;
}

export const WorkerVerificationScreen: React.FC<WorkerVerificationScreenProps> = ({
  onSuccess,
  onBack,
}) => {
  const { submitVerification, isLoading } = useWorker();

  const [documentType, setDocumentType] = useState<DocumentType>('nin');
  const [idNumber, setIdNumber] = useState('');
  const [photoAttached, setPhotoAttached] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePickDocumentPhoto = async () => {
    try {
      const photo = await MediaService.promptMediaPicker({
        title: 'Upload Identity Document',
        message: 'Take a photo with your camera or select an existing image from your gallery',
      });
      if (photo) {
        setPhotoUri(photo.uri);
        setPhotoAttached(true);
        if (error) setError(null);
      }
    } catch (err) {
      console.warn('[WorkerVerificationScreen] Photo picker error:', err);
    }
  };

  const docOptions: { type: DocumentType; label: string; hint: string }[] = [
    { type: 'nin', label: 'National ID (NIN)', hint: 'Strictly 11 digits issued by NIMC' },
    { type: 'voters_card', label: "Voter's Card", hint: 'INEC voter identification number' },
    { type: 'drivers_license', label: "Driver's License", hint: 'FRSC driver license number' },
    { type: 'international_passport', label: 'Passport', hint: 'Nigerian international passport' },
  ];

  const handleSubmit = async () => {
    setError(null);
    if (!idNumber.trim()) {
      setError('Please provide your identity document number.');
      return;
    }

    if (documentType === 'nin') {
      const cleaned = idNumber.replace(/\D/g, '');
      if (cleaned.length !== 11) {
        setError('National Identity Number (NIN) must be exactly 11 digits (§80).');
        return;
      }
    }

    if (!photoAttached) {
      setError('Please attach or take a photo of your identity document.');
      return;
    }

    const result = await submitVerification({
      documentType,
      idNumber: idNumber.trim(),
      documentUrl: photoUri || 'supabase://documents/mock_nin_slip.jpg',
    });

    if (result.success) {
      if (onSuccess) onSuccess();
    } else {
      setError(result.error || 'Failed to submit verification dossier.');
    }
  };

  const getMaskedPreview = () => {
    const cleaned = idNumber.replace(/\D/g, '');
    if (cleaned.length >= 4) {
      return `*******${cleaned.slice(-4)}`;
    }
    return '*******';
  };

  return (
    <View style={styles.container}>
      <TopBar title="NIN Verification" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Identity Verification</Text>
          <Text style={styles.subtitle}>
            Authenticate your government credentials to receive verified pro status and instant access to marketplace jobs.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Section 80 NDPA Privacy Banner */}
        <View style={styles.ndpaCard}>
          <View style={styles.ndpaHeaderRow}>
            <Text style={styles.ndpaIcon}>🛡️</Text>
            <Text style={styles.ndpaTitle}>NDPA Privacy Guaranteed (§80)</Text>
          </View>
          <Text style={styles.ndpaBody}>
            In compliance with the Nigeria Data Protection Act, your identity number is encrypted at rest and masked in all audit logs. Only authorized verification staff inspect review dossiers.
          </Text>
        </View>

        {/* Document Type Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Select Document Type</Text>
          <View style={styles.docTypeGrid}>
            {docOptions.map((opt) => {
              const isSelected = documentType === opt.type;
              return (
                <TouchableOpacity
                  key={opt.type}
                  style={[styles.docTypeButton, isSelected && styles.docTypeButtonActive]}
                  onPress={() => {
                    setDocumentType(opt.type);
                    setIdNumber('');
                    setError(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.docTypeLabel,
                      isSelected && styles.docTypeLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    style={[
                      styles.docTypeHint,
                      isSelected && styles.docTypeHintActive,
                    ]}
                  >
                    {opt.hint}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ID Number Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            2. Enter {documentType === 'nin' ? 'NIN (11 Digits)' : 'Document Number'}
          </Text>
          <Input
            placeholder={documentType === 'nin' ? '12345678901' : 'ABC12345678'}
            value={idNumber}
            onChangeText={(val) => {
              setIdNumber(val);
              if (error) setError(null);
            }}
            keyboardType={documentType === 'nin' ? 'number-pad' : 'default'}
            maxLength={documentType === 'nin' ? 11 : 25}
            style={styles.idInput}
          />
          {idNumber.length >= 4 && (
            <View style={styles.maskPreviewRow}>
              <Text style={styles.maskPreviewLabel}>Stored for NDPA compliance as: </Text>
              <Text style={styles.maskPreviewValue}>{getMaskedPreview()}</Text>
            </View>
          )}
        </View>

        {/* Document Photo Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Document Photo Attachment</Text>
          <Text style={styles.sectionHint}>
            Upload a clear photo or NIN slip image showing your name and photograph.
          </Text>

          <Card
            style={styles.uploadCard}
            onPress={handlePickDocumentPhoto}
          >
            {photoAttached ? (
              <View style={styles.attachedContainer}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.docThumbnail} />
                ) : (
                  <Text style={styles.attachedIcon}>📄</Text>
                )}
                <View style={styles.attachedTextGroup}>
                  <Text style={styles.attachedTitle}>
                    {photoUri ? 'id_document_capture.jpg' : 'nin_slip_document.jpg'}
                  </Text>
                  <Text style={styles.attachedSubtitle}>Ready to upload • Tap to change photo</Text>
                </View>
                <Badge label="ATTACHED" type="verified" />
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Text style={styles.cameraIcon}>📷</Text>
                <Text style={styles.uploadTitle}>Tap to capture or upload ID document</Text>
                <Text style={styles.uploadHint}>Camera or Gallery (compressed ≤ 150KB)</Text>
              </View>
            )}
          </Card>
        </View>

        <Button
          title="Submit Verification Dossier"
          onPress={handleSubmit}
          loading={isLoading}
          style={styles.submitButton}
        />
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
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.scale.headlineLgMobile,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.scale.bodyMd,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: Colors.dangerContainer,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.danger,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    ...Typography.scale.bodySm,
    color: Colors.dangerText,
    fontWeight: '500',
  },
  ndpaCard: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: Spacing.lg,
  },
  ndpaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ndpaIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  ndpaTitle: {
    ...Typography.scale.labelMd,
    color: Colors.primary,
    fontWeight: '700',
  },
  ndpaBody: {
    ...Typography.scale.bodySm,
    color: Colors.textPrimary,
    lineHeight: 18,
    fontSize: 11,
  },
  section: {
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  sectionHint: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  docTypeGrid: {
    gap: Spacing.sm,
  },
  docTypeButton: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSubtle,
  },
  docTypeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  docTypeLabel: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  docTypeLabelActive: {
    color: Colors.primary,
  },
  docTypeHint: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
    fontSize: 11,
  },
  docTypeHintActive: {
    color: Colors.primary,
    opacity: 0.8,
  },
  idInput: {
    ...Typography.scale.bodyLg,
    letterSpacing: 1,
  },
  maskPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -Spacing.xs,
  },
  maskPreviewLabel: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  maskPreviewValue: {
    ...Typography.scale.bodySm,
    color: Colors.primary,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  uploadCard: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  cameraIcon: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  uploadTitle: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  uploadHint: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
    fontSize: 11,
  },
  attachedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  attachedIcon: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  attachedTextGroup: {
    flex: 1,
  },
  attachedTitle: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  attachedSubtitle: {
    ...Typography.scale.bodySm,
    color: Colors.secondaryText,
    fontSize: 11,
  },
  docThumbnail: {
    width: 44,
    height: 44,
    borderRadius: Radii.sm,
    marginRight: Spacing.md,
    backgroundColor: Colors.border,
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
});
