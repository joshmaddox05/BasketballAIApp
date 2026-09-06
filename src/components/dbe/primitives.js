// primitives.js — DBE shared building blocks (design handoff step 1).
// Header, section labels, stat tiles, rows, avatars, chips, buttons, empty state.
// All read theme from AppContext; pixel values follow README §Spacing & shape.
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { TYPE, SHAPE } from '../../utils/typography';
import { Entrance } from './motion';

/**
 * ScreenHeader — title block + trailing icon buttons, hairline bottom border.
 * Top-level screens: 22/800 title (+ optional greeting). Sub-screens: pass
 * onBack for the 17/800 chevron variant.
 */
export function ScreenHeader({ title, subtitle, onBack, right, style }) {
  const { theme } = useAppContext();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: onBack ? 'center' : 'flex-end',
          justifyContent: 'space-between',
          paddingHorizontal: SHAPE.screenPadding,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.hairline,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ marginRight: 10 }}
          >
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={[onBack ? TYPE.subScreenTitle : TYPE.screenTitle, { color: theme.text }]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[TYPE.greeting, { color: theme.textDim }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {/* gap 10 (on the spacing scale; 8 was drift) is also exactly what two
          44pt touch targets need to sit adjacent without their hitSlop overlapping. */}
      {right ? <View style={{ flexDirection: 'row', gap: 10 }}>{right}</View> : null}
    </View>
  );
}

/**
 * HeaderIconButton — 34×34, radius 10, hairline border. Optional badge dot.
 */
export function HeaderIconButton({ icon, onPress, badge, style, accessibilityLabel }) {
  const { theme } = useAppContext();
  return (
    <TouchableOpacity
      onPress={onPress}
      // The drawn size is 34 (DESIGN.md's header spec) but the iOS floor is 44,
      // so the touch target is grown by 5 on every side and the visual is left
      // alone. 5 is the largest value that does not overlap a neighbour: the
      // header's right slot gaps siblings by 10, so two slop regions meet
      // exactly rather than fighting over the pixels between them.
      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
      accessibilityRole="button"
      // Icon-only control: without an explicit label VoiceOver announces nothing.
      // Fall back to the icon name so it is never silent.
      accessibilityLabel={accessibilityLabel || icon?.replace(/-outline$/, '').replace(/-/g, ' ')}
      style={[
        {
          width: SHAPE.iconButton,
          height: SHAPE.iconButton,
          borderRadius: SHAPE.iconButtonRadius,
          borderWidth: 1,
          borderColor: theme.hairline,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={17} color={theme.text} />
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: theme.primary,
          }}
        />
      ) : null}
    </TouchableOpacity>
  );
}

/**
 * SectionLabel — uppercase 10.5/700 label, optional accent action on the right.
 */
export function SectionLabel({ children, action, onAction, style }) {
  const { theme } = useAppContext();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: SHAPE.labelGap,
        },
        style,
      ]}
    >
      <Text style={[TYPE.sectionLabel, { color: theme.textDim }]}>{children}</Text>
      {action ? (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontFamily: TYPE.rowTitle.fontFamily, fontSize: 13, color: theme.accentText }}>
            {action}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/**
 * StatTile — big Archivo number over an uppercase caption. accent=true renders
 * the flagged/attention variant. Staggered entrance via `delay`.
 */
export function StatTile({ value, label, accent, delay = 0, onPress, style }) {
  const { theme } = useAppContext();
  const inner = (
    <Entrance
      variant="cardIn"
      delay={delay}
      style={[
        {
          flex: 1,
          backgroundColor: accent ? theme.attentionFill : theme.surface,
          borderWidth: accent ? 1 : 0,
          borderColor: accent ? theme.attentionBorder : 'transparent',
          borderRadius: SHAPE.radiusCard,
          padding: SHAPE.cardPadding,
        },
        style,
      ]}
    >
      <Text style={[TYPE.statNumber, { color: accent ? theme.accentText : theme.text }]}>{value}</Text>
      <Text style={[TYPE.statCaption, { color: accent ? theme.accentText : theme.textDim, marginTop: 5 }]}>
        {label}
      </Text>
    </Entrance>
  );
  if (!onPress) return inner;
  return (
    <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.8} onPress={onPress}>
      {inner}
    </TouchableOpacity>
  );
}

/**
 * Avatar — initials disc. tone: 'accent' (burgundy tint) | 'steel' (neutral).
 */
export function Avatar({ initials, size = 38, tone = 'accent', style }) {
  const { theme } = useAppContext();
  const accent = tone === 'accent';
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: accent ? theme.avatarFill : theme.steelFill,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: TYPE.buttonPrimary.fontFamily,
          fontSize: size * 0.33,
          color: accent ? theme.accentText : theme.steel,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

/**
 * Row — surface card row: leading element, title + meta, trailing element.
 */
export function Row({ leading, title, meta, trailing, onPress, style }) {
  const { theme } = useAppContext();
  const content = (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: SHAPE.radiusCard,
          padding: SHAPE.cardPadding,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 11,
        },
        style,
      ]}
    >
      {leading}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[TYPE.rowTitle, { color: theme.text }]}>
          {title}
        </Text>
        {meta ? (
          <Text numberOfLines={1} style={[TYPE.rowMeta, { color: theme.textDim }]}>
            {meta}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
  if (!onPress) return content;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      // Title and meta are two Texts; join them so the row announces as one item.
      accessibilityLabel={meta ? `${title}, ${meta}` : title}
    >
      {content}
    </TouchableOpacity>
  );
}

/**
 * Chip — small pill tag. active renders solid primary.
 */
export function Chip({ label, active, onPress, style, small }) {
  const { theme } = useAppContext();
  // A chip draws at ~26pt tall (16 for the small variant) — well under the 44pt
  // floor. Grow the target VERTICALLY only: chip rows sit side by side with small
  // gaps, so horizontal slop would have neighbours competing for the same taps,
  // which is worse than a short target. Chips are wide enough horizontally that
  // the deficit is only ever vertical.
  const slop = small ? 14 : 9;
  return (
    <TouchableOpacity
      disabled={!onPress}
      onPress={onPress}
      hitSlop={onPress ? { top: slop, bottom: slop, left: 0, right: 0 } : undefined}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
      accessibilityState={onPress ? { selected: !!active } : undefined}
      style={[
        {
          paddingHorizontal: small ? 8 : 11,
          paddingVertical: small ? 3 : 6,
          borderRadius: SHAPE.radiusPill,
          backgroundColor: active ? theme.primary : theme.surface,
          borderWidth: active ? 0 : 1,
          borderColor: theme.hairline,
        },
        style,
      ]}
    >
      <Text
        style={[
          small ? TYPE.chipSmall : TYPE.chip,
          { color: active ? '#FFFFFF' : theme.textMuted },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * PrimaryButton / OutlineButton — the only two button voices in the system.
 * Deny/cancel is ALWAYS the outline; approve/confirm the solid primary.
 */
/**
 * `sentryLabel` (both buttons): opts this tap into Sentry interaction tracing.
 * Snake_case, stable, named like the values in services/analytics.js EVENTS —
 * it becomes part of the transaction name, so it must never contain anything a
 * user typed. Omit it and the tap is simply not traced, which is the default
 * for most buttons.
 */
export function PrimaryButton({ label, onPress, disabled, style, icon, iconRight, accessibilityLabel, accessibilityHint, sentryLabel }) {
  const { theme } = useAppContext();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      sentry-label={sentryLabel}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        {
          backgroundColor: disabled ? theme.buttonDisabled : theme.primary,
          borderRadius: SHAPE.radiusTile,
          paddingVertical: 13,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 7,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={16} color="#FFFFFF" /> : null}
      <Text style={[TYPE.buttonPrimary, { color: '#FFFFFF' }]}>{label}</Text>
      {iconRight ? <Ionicons name={iconRight} size={16} color="#FFFFFF" /> : null}
    </TouchableOpacity>
  );
}

export function OutlineButton({ label, onPress, disabled, style, icon, accessibilityLabel, accessibilityHint, sentryLabel }) {
  const { theme } = useAppContext();
  // The outline voice carries disabled the same way the primary one does. Without it,
  // callers that gate an action had to hand-roll the guard — and one that forgot let a
  // null selection through to a crash.
  // One dimming mechanism, not two: PrimaryButton signals disabled by swapping the
  // fill and keeping its label legible, so the outline voice dims the label only.
  const fg = disabled ? theme.textDim : theme.textMuted;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      sentry-label={sentryLabel}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        {
          borderWidth: 1,
          borderColor: theme.hairline,
          borderRadius: SHAPE.radiusTile,
          paddingVertical: 13,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 7,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={16} color={fg} /> : null}
      <Text style={[TYPE.buttonSecondary, { color: fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * EmptyState — icon in a burgundy-tint rounded square, Archivo title, dim sub,
 * one primary CTA. (README §Interactions: restyle, don't remove.)
 */
export function EmptyState({ icon = 'basketball-outline', title, sub, ctaLabel, onPress, style }) {
  const { theme } = useAppContext();
  return (
    <View style={[{ alignItems: 'center', paddingVertical: 44, paddingHorizontal: 32 }, style]}>
      <Entrance variant="pop">
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: SHAPE.radiusCard,
            backgroundColor: theme.badgeFill,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <Ionicons name={icon} size={28} color={theme.accentText} />
        </View>
      </Entrance>
      <Entrance variant="up" delay={90} style={{ alignSelf: 'stretch' }}>
        <Text style={[TYPE.tooltipTitle, { color: theme.text, textAlign: 'center' }]}>{title}</Text>
        {sub ? (
          <Text style={[TYPE.tooltipBody, { color: theme.textDim, textAlign: 'center', marginTop: 6 }]}>
            {sub}
          </Text>
        ) : null}
      </Entrance>
      {ctaLabel ? (
        <Entrance variant="chipPop" delay={180} style={{ alignSelf: 'stretch' }}>
          <PrimaryButton label={ctaLabel} onPress={onPress} style={{ marginTop: 18 }} />
        </Entrance>
      ) : null}
    </View>
  );
}

/**
 * LoadingState — centered spinner in primary.
 */
export function LoadingState({ style }) {
  const { theme } = useAppContext();
  return (
    <View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }, style]}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}
