import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useAppContext } from '../context/AppContext';
import { User, Palette, Bell, Info, LogOut, ChevronRight, Lock } from 'lucide-react-native';

export const SettingsView = () => {
  const { colors, spacing, typography, primary, isDark } = useTheme();
  const { state, dispatch } = useAppContext();

  const SettingItem = ({ icon: Icon, title, value, onPress, isPro = false, hasSwitch = false, switchValue = false, onSwitchChange = (v: boolean) => {} }: any) => (
    <TouchableOpacity 
      style={[styles.item, { borderBottomColor: colors.border }]} 
      onPress={onPress}
      disabled={hasSwitch}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: isPro ? '#FFD70020' : colors.background }]}>
          <Icon size={20} color={isPro ? '#FF9500' : primary} />
        </View>
        <Text style={[typography.body, { color: colors.text, marginLeft: spacing.m }]}>{title}</Text>
        {isPro && (
          <View style={styles.proBadge}>
            <Lock size={10} color="#FF9500" />
            <Text style={[typography.footnote, { color: '#FF9500', fontWeight: 'bold', marginLeft: 2 }]}>PRO</Text>
          </View>
        )}
      </View>
      <View style={styles.itemRight}>
        {hasSwitch ? (
          <Switch 
            value={switchValue} 
            onValueChange={onSwitchChange}
            trackColor={{ false: colors.border, true: primary }}
            thumbColor="#FFFFFF"
          />
        ) : (
          <>
            {value && <Text style={[typography.body, { color: colors.textSecondary, marginRight: spacing.xs }]}>{value}</Text>}
            <ChevronRight size={20} color={colors.textSecondary} />
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  const Section = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={[typography.footnote, { color: colors.textSecondary, marginBottom: spacing.xs, textTransform: 'uppercase', marginLeft: spacing.m }]}>
        {title}
      </Text>
      <View style={[styles.sectionContent, { backgroundColor: colors.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.profileHeader}>
        <View style={[styles.profileAvatar, { backgroundColor: primary }]}>
          <Text style={[typography.title2, { color: '#FFFFFF' }]}>JO</Text>
        </View>
        <Text style={[typography.title2, { color: colors.text, marginTop: spacing.s }]}>John Doe</Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>john@example.com</Text>
      </View>

      <Section title="Account">
        <SettingItem icon={User} title="Account Settings" onPress={() => {}} />
      </Section>

      <Section title="Display">
        <SettingItem 
          icon={Palette} 
          title="Dark Mode" 
          hasSwitch={true} 
          switchValue={isDark} 
          onSwitchChange={(v: boolean) => dispatch({ type: 'SET_THEME', payload: v ? 'dark' : 'light' })} 
        />
        <SettingItem icon={Palette} title="Events per person" value="5" isPro={true} onPress={() => {}} />
        <SettingItem icon={Palette} title="Calendar Density" value="Default" onPress={() => {}} />
      </Section>

      <Section title="Notifications">
        <SettingItem 
          icon={Bell} 
          title="Push Notifications" 
          hasSwitch={true} 
          switchValue={true} 
          onSwitchChange={() => {}} 
        />
        <SettingItem icon={Bell} title="Morning Brief" value="8:00 AM" onPress={() => {}} />
      </Section>

      <Section title="About">
        <SettingItem icon={Info} title="Version" value="1.0.0" onPress={() => {}} />
        <SettingItem icon={Info} title="Help & Support" onPress={() => {}} />
      </Section>

      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <LogOut size={20} color={colors.error} />
        <Text style={[typography.body, { color: colors.error, marginLeft: spacing.m, fontWeight: '600' }]}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionContent: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF950020',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginTop: 8,
  },
});
