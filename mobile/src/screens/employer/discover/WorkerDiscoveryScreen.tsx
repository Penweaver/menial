import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { EmployerDiscoverStackParamList } from '../../../navigation/types';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, formatKoboToNaira } from '../../../constants/theme';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { ApiService, SEED_CATEGORIES } from '../../../services/api';
import type { DiscoveredWorker } from '@shared/services/profile/ProfileService';

type NavigationProp = NativeStackNavigationProp<EmployerDiscoverStackParamList, 'WorkerDiscovery'>;

export const WorkerDiscoveryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [workers, setWorkers] = useState<DiscoveredWorker[]>([]);

  const categories = useMemo(() => [
    { id: 'all', name: 'All Categories', icon: '⚡' },
    ...SEED_CATEGORIES,
  ], []);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      const results = await ApiService.discoverWorkers({
        categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
        searchQuery,
        latitude: 6.4380, // Lekki Phase 1
        longitude: 3.4280,
        radiusKm: 25,
        verifiedOnly: true,
      });
      setWorkers(results);
    } catch (err) {
      console.error('Failed to discover workers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, [selectedCategory, searchQuery]);

  const renderWorkerCard = ({ item }: { item: DiscoveredWorker }) => (
    <Card style={styles.workerCard}>
      {/* Top Header: Avatar, Name, Verified Badge & Rate */}
      <View style={styles.cardHeader}>
        <View style={styles.workerIdentity}>
          <View style={styles.avatarContainer}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>
                  {item.fullName.split(' ').map((n) => n[0]).join('')}
                </Text>
              </View>
            )}
            <View style={styles.verifiedCheckPill}>
              <Text style={styles.checkIcon}>✓</Text>
            </View>
          </View>
          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <Text style={styles.workerName}>{item.fullName}</Text>
              <Badge label="VERIFIED PRO" type="verified" />
            </View>
            <Text style={styles.workerCategory}>
              {SEED_CATEGORIES.find((c) => c.suggestedRateKobo === item.indicativeRateKobo)?.name || 'General Artisan'}
            </Text>
          </View>
        </View>

        <View style={styles.rateSection}>
          <Text style={styles.rateAmount}>
            {formatKoboToNaira(item.indicativeRateKobo ?? 350000)}
          </Text>
          <Text style={styles.rateUnit}>/ rate</Text>
        </View>
      </View>

      {/* Metadata Badges (Rating, Jobs, Distance) */}
      <View style={styles.metadataRow}>
        <View style={styles.ratingBadge}>
          <Text style={styles.starIcon}>★</Text>
          <Text style={styles.ratingText}>
            {item.ratingAvg?.toFixed(1) || '4.9'} ({item.completedJobsCount} jobs)
          </Text>
        </View>
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceIcon}>📍</Text>
          <Text style={styles.distanceText}>{item.distanceKm.toFixed(1)} km away</Text>
        </View>
        <View style={styles.availabilityBadge}>
          <View style={styles.activeDot} />
          <Text style={styles.availabilityText}>Ready Now</Text>
        </View>
      </View>

      {/* Bio snippet */}
      {item.bio ? (
        <Text style={styles.bioSnippet} numberOfLines={2}>
          {item.bio}
        </Text>
      ) : null}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <Button
          title="View Profile"
          variant="outline"
          onPress={() => navigation.navigate('WorkerDetail', { workerId: item.id })}
          style={styles.profileBtn}
        />
        <Button
          title="Hire Worker"
          variant="primary"
          onPress={() => navigation.navigate('HireWorker', { workerId: item.id })}
          style={styles.hireBtn}
        />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Stitch Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.locationContainer}>
          <Text style={styles.brandTitle}>menial</Text>
          <View style={styles.locationPill}>
            <Text style={styles.locationPin}>📍</Text>
            <Text style={styles.locationText}>Lekki Phase 1, Lagos</Text>
          </View>
        </View>
        <View style={styles.trustTag}>
          <Text style={styles.trustTagText}>🛡️ ESCROW ACTIVE</Text>
        </View>
      </View>

      {/* Stitch Role Escrow Banner */}
      <View style={styles.escrowBanner}>
        <View style={styles.escrowHeader}>
          <Text style={styles.escrowPill}>NIN VERIFIED ESCROW</Text>
          <Text style={styles.escrowSub}>Guaranteed Payout Security</Text>
        </View>
        <Text style={styles.escrowTitle}>
          Find dependable, background-checked Nigerian workers in minutes.
        </Text>
        <Text style={styles.escrowDesc}>
          Zero upfront direct risk. Every Naira remains safely held in the menial Escrow Vault until you inspect and approve completed work.
        </Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, skill, or keyword..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Pills (Horizontal Scroll) */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Feed Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Searching nearby verified workers...</Text>
        </View>
      ) : (
        <FlatList
          data={workers}
          keyExtractor={(item) => item.id}
          renderItem={renderWorkerCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No workers match your filter</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search query, choosing a different category, or expanding your radius.
              </Text>
              <Button
                title="Reset Filters"
                variant="outline"
                onPress={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                style={styles.resetBtn}
              />
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  topBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  brandTitle: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.canvas,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 4,
  },
  locationPin: {
    fontSize: 12,
  },
  locationText: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  trustTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  trustTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  escrowBanner: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  escrowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  escrowPill: {
    backgroundColor: COLORS.secondary,
    color: COLORS.surface,
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  escrowSub: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: '500',
  },
  escrowTitle: {
    color: COLORS.surface,
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  escrowDesc: {
    color: '#D1FAE5',
    fontSize: TYPOGRAPHY.caption.fontSize,
    lineHeight: 16,
  },
  searchWrapper: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    height: 44,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: TYPOGRAPHY.body.fontSize,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    color: COLORS.textPrimary,
  },
  categoriesWrapper: {
    marginTop: SPACING.sm,
  },
  categoriesContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 6,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryName: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryNameSelected: {
    color: COLORS.surface,
  },
  listContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  workerCard: {
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  workerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  verifiedCheckPill: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  checkIcon: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: '900',
  },
  nameSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workerName: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  workerCategory: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rateSection: {
    alignItems: 'flex-end',
  },
  rateAmount: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '800',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
  rateUnit: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  starIcon: {
    color: '#D97706',
    fontSize: 12,
  },
  ratingText: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '700',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.canvas,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 4,
  },
  distanceIcon: {
    fontSize: 11,
  },
  distanceText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.secondary,
  },
  availabilityText: {
    color: '#0369A1',
    fontSize: 11,
    fontWeight: '600',
  },
  bioSnippet: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: SPACING.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  profileBtn: {
    flex: 1,
    height: 40,
  },
  hireBtn: {
    flex: 1,
    height: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.body.fontSize,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    marginTop: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 18,
  },
  resetBtn: {
    marginTop: SPACING.md,
    minWidth: 140,
  },
});
