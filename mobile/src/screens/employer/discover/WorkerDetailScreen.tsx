import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { EmployerDiscoverStackParamList } from '../../../navigation/types';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, formatKoboToNaira } from '../../../constants/theme';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { TopBar } from '../../../components/common/TopBar';
import { ApiService, SEED_CATEGORIES } from '../../../services/api';

type RouteProps = RouteProp<EmployerDiscoverStackParamList, 'WorkerDetail'>;
type NavProp = NativeStackNavigationProp<EmployerDiscoverStackParamList, 'WorkerDetail'>;

export const WorkerDetailScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProp>();
  const { workerId } = route.params;

  const worker = ApiService.getWorkerById(workerId);

  if (!worker) {
    return (
      <View style={styles.container}>
        <TopBar title="Worker Profile" onBack={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Worker profile not found.</Text>
          <Button title="Go Back" variant="outline" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  const categoryName = SEED_CATEGORIES.find((c) => worker.categoryIds.includes(c.id))?.name || 'General Services';

  return (
    <View style={styles.container}>
      <TopBar
        title="Worker Dossier"
        onBack={() => navigation.goBack()}
        rightAction={<Badge label="VERIFIED" type="verified" />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Worker Hero Profile Card */}
        <Card style={styles.heroCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrapper}>
              {worker.avatarUrl ? (
                <Image source={{ uri: worker.avatarUrl }} style={styles.largeAvatar} />
              ) : (
                <View style={styles.largeAvatarFallback}>
                  <Text style={styles.largeInitials}>
                    {worker.fullName.split(' ').map((n) => n[0]).join('')}
                  </Text>
                </View>
              )}
              <View style={styles.verifiedShield}>
                <Text style={styles.shieldCheck}>✓</Text>
              </View>
            </View>

            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{worker.fullName}</Text>
              <Text style={styles.heroCategory}>{categoryName}</Text>
              <Text style={styles.heroLocation}>📍 {worker.locationName}</Text>
              <View style={styles.standingBadge}>
                <Text style={styles.standingText}>🛡️ NIN Verified Artisan · Joined {worker.joinedYear}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Performance Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>★ {worker.ratingAvg.toFixed(1)}</Text>
            <Text style={styles.metricLabel}>Rating ({worker.completedJobsCount})</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>99%</Text>
            <Text style={styles.metricLabel}>On-Time Arrival</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>100%</Text>
            <Text style={styles.metricLabel}>Escrow Trust</Text>
          </View>
        </View>

        {/* Transparent Wage Card */}
        <Card style={styles.pricingCard}>
          <Text style={styles.sectionTitle}>Indicative Standard Rates</Text>
          <Text style={styles.pricingSub}>Regulated under Nigerian marketplace standards</Text>

          <View style={styles.rateRow}>
            <View>
              <Text style={styles.rateTierLabel}>Standard Service Rate</Text>
              <Text style={styles.rateTierDesc}>Standard task rate or initial block</Text>
            </View>
            <Text style={styles.rateFigure}>
              {formatKoboToNaira(worker.indicativeRate)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.rateRow}>
            <View>
              <Text style={styles.rateTierLabel}>Full Day Engagement (8h)</Text>
              <Text style={styles.rateTierDesc}>Dedicated full day shift</Text>
            </View>
            <Text style={styles.rateFigure}>
              {formatKoboToNaira(worker.indicativeRate * 2)}
            </Text>
          </View>
        </Card>

        {/* Skills & Specialties */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Skills & Expertise</Text>
          <View style={styles.skillsWrapper}>
            {worker.skills.map((skill, index) => (
              <View key={index} style={styles.skillPill}>
                <Text style={styles.skillText}>✓ {skill}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Professional Bio */}
        {worker.bio ? (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Professional Bio</Text>
            <Text style={styles.bioText}>{worker.bio}</Text>
          </Card>
        ) : null}

        {/* Verified Reviews */}
        <Card style={styles.sectionCard}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Customer Reviews ({worker.reviews.length})</Text>
            <Text style={styles.verifiedReviewsTag}>✓ Verified Completed Jobs</Text>
          </View>

          {worker.reviews.map((rev) => (
            <View key={rev.id} style={styles.reviewItem}>
              <View style={styles.reviewMeta}>
                <Text style={styles.reviewAuthor}>{rev.author}</Text>
                <View style={styles.reviewRating}>
                  <Text style={styles.reviewStar}>{'★'.repeat(rev.rating)}</Text>
                  <Text style={styles.reviewDate}> · {rev.date}</Text>
                </View>
              </View>
              <Text style={styles.reviewComment}>{rev.comment}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomPriceLabel}>Indicative Rate</Text>
          <Text style={styles.bottomPriceValue}>
            {formatKoboToNaira(worker.indicativeRate)}
          </Text>
        </View>
        <Button
          title="Hire Worker"
          variant="primary"
          onPress={() => navigation.navigate('HireWorker', { workerId: worker.id })}
          style={styles.hireCta}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 110,
    gap: SPACING.md,
  },
  heroCard: {
    padding: SPACING.md,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  avatarWrapper: {
    position: 'relative',
  },
  largeAvatar: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.lg,
  },
  largeAvatarFallback: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.lg,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeInitials: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  verifiedShield: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  shieldCheck: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: '900',
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  heroCategory: {
    fontSize: TYPOGRAPHY.body.fontSize,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  heroLocation: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  standingBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  standingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  metricValue: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '800',
    color: COLORS.primary,
  },
  metricLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  pricingCard: {
    padding: SPACING.md,
  },
  sectionCard: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  pricingSub: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateTierLabel: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  rateTierDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  rateFigure: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '800',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.sm,
  },
  skillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  skillPill: {
    backgroundColor: COLORS.canvas,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  skillText: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  bioText: {
    fontSize: TYPOGRAPHY.body.fontSize,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginTop: SPACING.xs,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  verifiedReviewsTag: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  reviewItem: {
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  reviewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewAuthor: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewStar: {
    color: '#F59E0B',
    fontSize: 12,
  },
  reviewDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  reviewComment: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  bottomPrice: {
    flex: 1,
  },
  bottomPriceLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  bottomPriceValue: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: '800',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
  hireCta: {
    flex: 1.5,
    height: 52,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: TYPOGRAPHY.body.fontSize,
    color: COLORS.error,
    marginBottom: SPACING.md,
  },
});
