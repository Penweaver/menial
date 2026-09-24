/**
 * Menial Mobile - Active Emergency SOS Banner
 * 
 * High-visibility persistent emergency indicator rendered at the top of active
 * job execution screens whenever an active SOS dossier is open (§49).
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Colors, Spacing, Radii, Typography } from '../../constants/theme';

export interface ActiveSosBannerProps {
  dossierRef: string;
  category?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ActiveSosBanner: React.FC<ActiveSosBannerProps> = ({
  dossierRef,
  category,
  onPress,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => pulseLoop.stop();
  }, [pulseAnim]);

  const formattedCategory = category
    ? category.replace(/_/g, ' ').toUpperCase()
    : 'CRITICAL ALERT';

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="alert"
      accessibilityLabel={`Active Emergency SOS alert banner for incident ref ${dossierRef}. Menial safety command is alerted. Tap to open emergency dossier and hotlines.`}
      accessibilityHint="Opens emergency incident dossier with 1-tap call for 112 and 767 hotlines"
    >
      <View style={styles.leftRow}>
        <Animated.View style={[styles.beaconDot, { opacity: pulseAnim }]}>
          <Text style={styles.beaconIcon}>🚨</Text>
        </Animated.View>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>ACTIVE EMERGENCY SOS</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{formattedCategory}</Text>
            </View>
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            Ref: {dossierRef} · Rapid Response Alerted
          </Text>
        </View>
      </View>

      <View style={styles.actionBtn}>
        <Text style={styles.actionText}>Dossier</Text>
        <Text style={styles.arrowIcon}>➔</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 52,
    backgroundColor: '#7F1D1D', // Deep high-contrast crimson
    borderColor: '#DC2626',
    borderWidth: 1.5,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  beaconDot: {
    marginRight: Spacing.sm,
  },
  beaconIcon: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  title: {
    color: '#FEF2F2',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  categoryBadge: {
    backgroundColor: '#991B1B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  categoryBadgeText: {
    color: '#FEE2E2',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    minHeight: 36,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginRight: 4,
  },
  arrowIcon: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
