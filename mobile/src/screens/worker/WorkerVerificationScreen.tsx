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
import { ApiService } from '../../services/api';
import type { CareReferenceInput } from '@shared/services/verification/VerificationService';

type DocumentType = 'nin' | 'voters_card' | 'drivers_license' | 'international_passport';
type VerificationTab = 'standard' | 'care' | 'technical';

interface WorkerVerificationScreenProps {
  onSuccess?: () => void;
  onBack?: () => void;
}

export const WorkerVerificationScreen: React.FC<WorkerVerificationScreenProps> = ({
  onSuccess,
  onBack,
}) => {
  const {
    submitVerification,
    submitCareVerification,
    submitTechnicalVerification,
    categories,
    profile,
    isLoading,
  } = useWorker();

  const [activeTab, setActiveTab] = useState<VerificationTab>('standard');
  const [error, setError] = useState<string | null>(null);

  // --- Standard Mode State ---
  const [documentType, setDocumentType] = useState<DocumentType>('nin');
  const [idNumber, setIdNumber] = useState('');
  const [photoAttached, setPhotoAttached] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // --- Care Tier State (§B.2) ---
  const careCategories = categories.filter((c) => c.verificationTier === 'care');
  const defaultCareCatId =
    careCategories.find((c) => profile.categoryIds?.includes(c.id))?.id ||
    careCategories[0]?.id ||
    'cat_childcare';
  const [careCategoryId, setCareCategoryId] = useState<string>(defaultCareCatId);
  const [policeCertUri, setPoliceCertUri] = useState<string | null>(null);
  const [references, setReferences] = useState<CareReferenceInput[]>([
    { name: '', relationship: 'Former Employer', phone: '' },
    { name: '', relationship: 'Family Reference', phone: '' },
  ]);

  // --- Technical Trade State (§B.3) ---
  const techCategories = categories.filter(
    (c) => c.verificationTier === 'technical_trade' || (c.verificationTier as string) === 'technical'
  );
  const defaultTechCatId =
    techCategories.find((c) => profile.categoryIds?.includes(c.id))?.id ||
    techCategories[0]?.id ||
    'cat_electrical';
  const [techCategoryId, setTechCategoryId] = useState<string>(defaultTechCatId);
  const [yearsExperience, setYearsExperience] = useState('4');
  const [portfolioUris, setPortfolioUris] = useState<string[]>([]);
  const [hasTradeCert, setHasTradeCert] = useState(false);
  const [certificateType, setCertificateType] = useState('Federal Ministry of Labour Trade Test');
  const [certificateGrade, setCertificateGrade] = useState('Grade II');
  const [certDocUri, setCertDocUri] = useState<string | null>(null);

  // Standard Photo Picker
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

  // Police Certificate Picker
  const handlePickPoliceCert = async () => {
    try {
      const photo = await MediaService.promptMediaPicker({
        title: 'Upload Police Character Certificate',
        message: 'Take a photo or upload your valid Police Character Clearance document',
      });
      if (photo) {
        setPoliceCertUri(photo.uri);
        if (error) setError(null);
      }
    } catch (err) {
      console.warn('[WorkerVerificationScreen] Police cert picker error:', err);
    }
  };

  // Portfolio Photo Picker
  const handleAddPortfolioPhoto = async () => {
    try {
      const photo = await MediaService.promptMediaPicker({
        title: 'Add Work Portfolio Photo',
        message: 'Upload clear photos of technical projects, site work, or completed installations',
      });
      if (photo) {
        setPortfolioUris((prev) => [...prev, photo.uri]);
        if (error) setError(null);
      }
    } catch (err) {
      console.warn('[WorkerVerificationScreen] Portfolio picker error:', err);
    }
  };

  // Trade Certificate Picker
  const handlePickTradeCertDoc = async () => {
    try {
      const photo = await MediaService.promptMediaPicker({
        title: 'Upload Trade Test / NABTEB Certificate',
        message: 'Upload a clear scan or photo of your official trade certificate',
      });
      if (photo) {
        setCertDocUri(photo.uri);
        if (error) setError(null);
      }
    } catch (err) {
      console.warn('[WorkerVerificationScreen] Cert picker error:', err);
    }
  };

  // Care Reference Helpers
  const updateReference = (index: number, field: keyof CareReferenceInput, value: string) => {
    setReferences((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addReference = () => {
    setReferences((prev) => [
      ...prev,
      { name: '', relationship: 'Reference', phone: '' },
    ]);
  };

  const removeReference = (index: number) => {
    if (references.length <= 2) {
      setError('Minimum 2 contactable references are strictly mandatory for Care Tier (§B.2).');
      return;
    }
    setReferences((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Submissions ---
  const handleStandardSubmit = async () => {
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

  const handleCareSubmit = async () => {
    setError(null);
    if (!policeCertUri) {
      setError('Police Character Certificate upload is mandatory for Care Tier (§B.2).');
      return;
    }

    const val = ApiService.validateCareReferences(references);
    if (!val.valid) {
      setError(val.error || 'Care Tier requires a minimum of 2 valid contactable references (§B.2).');
      return;
    }

    const result = await submitCareVerification({
      categoryId: careCategoryId,
      policeCertUrl: policeCertUri,
      references,
    });

    if (result.success) {
      if (onSuccess) onSuccess();
    } else {
      setError(result.error || 'Failed to submit care verification.');
    }
  };

  const handleTechnicalSubmit = async () => {
    setError(null);
    const parsedYears = parseInt(yearsExperience.replace(/\D/g, ''), 10);
    if (isNaN(parsedYears) || parsedYears < 0) {
      setError('Please enter valid years of experience.');
      return;
    }

    if (portfolioUris.length === 0) {
      setError('Please attach at least 1 work portfolio photo showing past technical work (§B.3).');
      return;
    }

    if (hasTradeCert && !certDocUri) {
      setError('Please attach a photo of your Trade Test or NABTEB certificate.');
      return;
    }

    const result = await submitTechnicalVerification({
      categoryId: techCategoryId,
      experienceYears: parsedYears,
      portfolioUrls: portfolioUris,
      certificateType: hasTradeCert ? certificateType : undefined,
      certificateGrade: hasTradeCert ? certificateGrade : undefined,
      certificateUrl: hasTradeCert && certDocUri ? certDocUri : undefined,
    });

    if (result.success) {
      if (onSuccess) onSuccess();
    } else {
      setError(result.error || 'Failed to submit technical trade verification.');
    }
  };

  const getMaskedPreview = () => {
    const cleaned = idNumber.replace(/\D/g, '');
    if (cleaned.length >= 4) {
      return `*******${cleaned.slice(-4)}`;
    }
    return '*******';
  };

  const docOptions: { type: DocumentType; label: string; hint: string }[] = [
    { type: 'nin', label: 'National ID (NIN)', hint: 'Strictly 11 digits issued by NIMC' },
    { type: 'voters_card', label: "Voter's Card", hint: 'INEC voter identification number' },
    { type: 'drivers_license', label: "Driver's License", hint: 'FRSC driver license number' },
    { type: 'international_passport', label: 'Passport', hint: 'Nigerian international passport' },
  ];

  return (
    <View style={styles.container}>
      <TopBar title="Worker Verification" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Tier Tabs Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'standard' && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab('standard');
              setError(null);
            }}
          >
            <Text style={[styles.tabText, activeTab === 'standard' && styles.tabTextActive]}>
              Standard (NIN)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'care' && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab('care');
              setError(null);
            }}
          >
            <Text style={[styles.tabText, activeTab === 'care' && styles.tabTextActive]}>
              Care Tier (§B.2)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'technical' && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab('technical');
              setError(null);
            }}
          >
            <Text style={[styles.tabText, activeTab === 'technical' && styles.tabTextActive]}>
              Technical (§B.3)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Intro Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {activeTab === 'standard' && 'Identity Verification (NIN)'}
            {activeTab === 'care' && 'Care Tier Safeguarding (§B.2)'}
            {activeTab === 'technical' && 'Technical Trade Verification (§B.3)'}
          </Text>
          <Text style={styles.subtitle}>
            {activeTab === 'standard' &&
              'Authenticate your government credentials to receive verified pro status and instant access to general marketplace jobs.'}
            {activeTab === 'care' &&
              'Enhanced safeguarding for domestic, childcare, and vulnerable adult care services. Requires Police Character Certificate and minimum 2 references.'}
            {activeTab === 'technical' &&
              'Artisan credentialing for licensed trades. Requires declared experience, work portfolio, and optional Trade Test/NABTEB certification.'}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ========================================================= */}
        {/* TAB 1: STANDARD IDENTITY VERIFICATION                     */}
        {/* ========================================================= */}
        {activeTab === 'standard' && (
          <>
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

              <Card style={styles.uploadCard} onPress={handlePickDocumentPhoto}>
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
              onPress={handleStandardSubmit}
              loading={isLoading}
              style={styles.submitButton}
            />
          </>
        )}

        {/* ========================================================= */}
        {/* TAB 2: CARE TIER VERIFICATION (§B.2)                      */}
        {/* ========================================================= */}
        {activeTab === 'care' && (
          <>
            {/* Category Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Target Care Category</Text>
              <Text style={styles.sectionHint}>
                Choose which care specialty you are applying to verify (§B.2).
              </Text>
              <View style={styles.categoryPillGroup}>
                {careCategories.map((c) => {
                  const isSelected = careCategoryId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                      onPress={() => setCareCategoryId(c.id)}
                    >
                      <Text
                        style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Police Character Certificate Upload */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>2. Police Character Certificate</Text>
                <Badge label="MANDATORY" type="pending" />
              </View>
              <Text style={styles.sectionHint}>
                Official Police Character Certificate issued by the Nigeria Police Force (CID / Alagbon).
              </Text>

              <Card style={styles.uploadCard} onPress={handlePickPoliceCert}>
                {policeCertUri ? (
                  <View style={styles.attachedContainer}>
                    <Image source={{ uri: policeCertUri }} style={styles.docThumbnail} />
                    <View style={styles.attachedTextGroup}>
                      <Text style={styles.attachedTitle}>police_character_clearance.jpg</Text>
                      <Text style={styles.attachedSubtitle}>Valid clearance attached • Tap to replace</Text>
                    </View>
                    <Badge label="ATTACHED" type="verified" />
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Text style={styles.cameraIcon}>📜</Text>
                    <Text style={styles.uploadTitle}>Upload Police Character Certificate</Text>
                    <Text style={styles.uploadHint}>Clear photo of official stamp & signature</Text>
                  </View>
                )}
              </Card>
            </View>

            {/* Minimum 2 References (§B.2) */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>3. Professional & Character References</Text>
                <Text style={styles.referenceCounter}>
                  {references.length} / 2 Min
                </Text>
              </View>
              <Text style={styles.sectionHint}>
                Provide at least 2 contactable references (former employers or guardians). Our trust team calls each reference directly.
              </Text>

              {references.map((ref, idx) => (
                <View key={idx} style={styles.referenceCard}>
                  <View style={styles.referenceHeaderRow}>
                    <Text style={styles.referenceTitle}>Reference #{idx + 1}</Text>
                    {references.length > 2 && (
                      <TouchableOpacity onPress={() => removeReference(idx)}>
                        <Text style={styles.removeReferenceText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Input
                    label="Full Name"
                    placeholder="e.g. Mrs. Funke Johnson"
                    value={ref.name}
                    onChangeText={(val) => updateReference(idx, 'name', val)}
                    style={styles.refInput}
                  />

                  <Input
                    label="Relationship / Capacity"
                    placeholder="e.g. Former Employer, Nursery Principal, Family"
                    value={ref.relationship}
                    onChangeText={(val) => updateReference(idx, 'relationship', val)}
                    style={styles.refInput}
                  />

                  <Input
                    label="Phone Number"
                    placeholder="e.g. +2348031234567"
                    value={ref.phone}
                    onChangeText={(val) => updateReference(idx, 'phone', val)}
                    keyboardType="phone-pad"
                    style={styles.refInput}
                  />
                </View>
              ))}

              <Button
                title="+ Add Another Reference"
                variant="outline"
                onPress={addReference}
                style={styles.addRefButton}
              />
            </View>

            <Button
              title="Submit Care Verification Dossier"
              onPress={handleCareSubmit}
              loading={isLoading}
              style={styles.submitButton}
            />
          </>
        )}

        {/* ========================================================= */}
        {/* TAB 3: TECHNICAL TRADE VERIFICATION (§B.3)                */}
        {/* ========================================================= */}
        {activeTab === 'technical' && (
          <>
            {/* Category Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Select Technical Trade</Text>
              <Text style={styles.sectionHint}>
                Select the trade category for experience and certification review (§B.3).
              </Text>
              <View style={styles.categoryPillGroup}>
                {techCategories.map((c) => {
                  const isSelected = techCategoryId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                      onPress={() => setTechCategoryId(c.id)}
                    >
                      <Text
                        style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Declared Experience */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Years of Practical Experience</Text>
              <Text style={styles.sectionHint}>
                How many years have you been working in this technical artisan trade?
              </Text>
              <Input
                label="Years of Experience"
                placeholder="4"
                value={yearsExperience}
                onChangeText={(val) => setYearsExperience(val.replace(/\D/g, ''))}
                keyboardType="number-pad"
                style={styles.idInput}
              />
            </View>

            {/* Work Portfolio Uploads (Minimum 1) */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>3. Work Portfolio Photos</Text>
                <Text style={styles.referenceCounter}>
                  {portfolioUris.length} Uploaded (Min 1)
                </Text>
              </View>
              <Text style={styles.sectionHint}>
                Upload photos of your completed installations, repairs, wiring, or fabrication work.
              </Text>

              {portfolioUris.length > 0 && (
                <View style={styles.portfolioGrid}>
                  {portfolioUris.map((uri, idx) => (
                    <View key={idx} style={styles.portfolioThumbWrap}>
                      <Image source={{ uri }} style={styles.portfolioThumb} />
                      <TouchableOpacity
                        style={styles.removePortfolioBtn}
                        onPress={() =>
                          setPortfolioUris((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        <Text style={styles.removePortfolioText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Card style={styles.uploadCard} onPress={handleAddPortfolioPhoto}>
                <View style={styles.uploadPlaceholder}>
                  <Text style={styles.cameraIcon}>📸</Text>
                  <Text style={styles.uploadTitle}>+ Add Portfolio Photo</Text>
                  <Text style={styles.uploadHint}>Before/after photos, completed sites, or workshops</Text>
                </View>
              </Card>
            </View>

            {/* Optional Trade Test / NABTEB Certification (§B.3) */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>4. Trade Test / Certification (Optional)</Text>
                <Badge label="CERTIFIED BADGE" type="verified" />
              </View>
              <Text style={styles.sectionHint}>
                Workers with verified Federal Trade Test or NABTEB certificates receive the prestigious "Certified Trade" badge on discovery cards.
              </Text>

              <TouchableOpacity
                style={[styles.certToggleCard, hasTradeCert && styles.certToggleCardActive]}
                onPress={() => setHasTradeCert(!hasTradeCert)}
                activeOpacity={0.8}
              >
                <View style={styles.certToggleCheck}>
                  <Text style={styles.certToggleCheckIcon}>{hasTradeCert ? '✓' : '○'}</Text>
                </View>
                <View style={styles.certToggleTextGroup}>
                  <Text style={styles.certToggleTitle}>
                    I hold a Federal Trade Test or NABTEB Certificate
                  </Text>
                  <Text style={styles.certToggleSubtitle}>
                    Enables Certified Trade badge and priority matching for commercial/technical jobs.
                  </Text>
                </View>
              </TouchableOpacity>

              {hasTradeCert && (
                <View style={styles.tradeCertForm}>
                  <Input
                    label="Certificate Type"
                    placeholder="e.g. Federal Ministry of Labour Trade Test"
                    value={certificateType}
                    onChangeText={setCertificateType}
                    style={styles.refInput}
                  />

                  <Input
                    label="Certificate Grade"
                    placeholder="e.g. Grade I, Grade II, Grade III, or Modular"
                    value={certificateGrade}
                    onChangeText={setCertificateGrade}
                    style={styles.refInput}
                  />

                  <Text style={styles.certDocLabel}>Certificate Document Scan / Photo</Text>
                  <Card style={styles.uploadCard} onPress={handlePickTradeCertDoc}>
                    {certDocUri ? (
                      <View style={styles.attachedContainer}>
                        <Image source={{ uri: certDocUri }} style={styles.docThumbnail} />
                        <View style={styles.attachedTextGroup}>
                          <Text style={styles.attachedTitle}>trade_test_certificate.jpg</Text>
                          <Text style={styles.attachedSubtitle}>Certificate attached • Tap to replace</Text>
                        </View>
                        <Badge label="ATTACHED" type="verified" />
                      </View>
                    ) : (
                      <View style={styles.uploadPlaceholder}>
                        <Text style={styles.cameraIcon}>📜</Text>
                        <Text style={styles.uploadTitle}>Upload Certificate Document</Text>
                        <Text style={styles.uploadHint}>Clear photo showing grade, seal, and candidate name</Text>
                      </View>
                    )}
                  </Card>
                </View>
              )}
            </View>

            <Button
              title="Submit Technical Trade Dossier"
              onPress={handleTechnicalSubmit}
              loading={isLoading}
              style={styles.submitButton}
            />
          </>
        )}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.md,
    padding: 4,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.sm,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    ...Typography.scale.labelSm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.primaryOn,
    fontWeight: '700',
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
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
  categoryPillGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSubtle,
  },
  categoryPillActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  categoryPillText: {
    ...Typography.scale.labelSm,
    color: Colors.textSecondary,
  },
  categoryPillTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  referenceCounter: {
    ...Typography.scale.labelSm,
    color: Colors.primary,
    fontWeight: '700',
  },
  referenceCard: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  referenceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  referenceTitle: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  removeReferenceText: {
    ...Typography.scale.labelSm,
    color: Colors.danger,
    fontWeight: '600',
  },
  refInput: {
    marginBottom: Spacing.sm,
  },
  addRefButton: {
    marginTop: Spacing.xs,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  portfolioThumbWrap: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  portfolioThumb: {
    width: '100%',
    height: '100%',
  },
  removePortfolioBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePortfolioText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  certToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSubtle,
    marginBottom: Spacing.md,
  },
  certToggleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  certToggleCheck: {
    marginRight: Spacing.md,
  },
  certToggleCheckIcon: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  certToggleTextGroup: {
    flex: 1,
  },
  certToggleTitle: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  certToggleSubtitle: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  tradeCertForm: {
    marginTop: Spacing.sm,
  },
  certDocLabel: {
    ...Typography.scale.labelSm,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
});
