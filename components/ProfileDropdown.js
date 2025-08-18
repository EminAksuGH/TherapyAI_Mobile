import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const ProfileDropdown = ({ visible, onClose, navigation }) => {
  const { currentUser, logout } = useAuth();
  const { colors, theme, toggleTheme, isDark } = useTheme();

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Çıkış Yap', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              onClose();
              navigation.navigate('Home');
            } catch (error) {
              console.error('Failed to log out', error);
              Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  const handleNavigation = (screenName) => {
    onClose();
    navigation.navigate(screenName);
  };

  if (!currentUser) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={[styles.dropdownContainer, { backgroundColor: colors.surface }]}>
          {/* User Info Section */}
          <View style={[styles.userInfo, { borderBottomColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Ionicons name="person" size={24} color="white" />
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {currentUser.displayName || 'Kullanıcı'}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                {currentUser.email}
              </Text>
              {!currentUser.emailVerified && (
                <Text style={[styles.verificationStatus, { color: colors.warning }]}>
                  ⚠️ E-posta doğrulanmamış
                </Text>
              )}
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            {/* Theme Toggle */}
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={toggleTheme}
            >
              <Ionicons 
                name={isDark ? "sunny-outline" : "moon-outline"} 
                size={20} 
                color={colors.primary} 
              />
              <Text style={[styles.menuText, { color: colors.text }]}>
                {isDark ? 'Açık Tema' : 'Koyu Tema'}
              </Text>
            </TouchableOpacity>

            {/* Memory List */}
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => handleNavigation('MemoryList')}
            >
              <Ionicons name="library-outline" size={20} color={colors.primary} />
              <Text style={[styles.menuText, { color: colors.text }]}>
                Hafıza Listesi
              </Text>
            </TouchableOpacity>

            {/* Profile Settings */}
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => handleNavigation('Profile')}
            >
              <Ionicons name="settings-outline" size={20} color={colors.primary} />
              <Text style={[styles.menuText, { color: colors.text }]}>
                Profil Ayarları
              </Text>
            </TouchableOpacity>

            {/* Chat */}
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => handleNavigation('Chat')}
            >
              <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
              <Text style={[styles.menuText, { color: colors.text }]}>
                Sohbet
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Logout */}
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text style={[styles.menuText, { color: colors.error }]}>
                Çıkış Yap
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 20,
  },
  dropdownContainer: {
    minWidth: 280,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    marginBottom: 2,
  },
  verificationStatus: {
    fontSize: 11,
    fontWeight: '500',
  },
  menuItems: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  menuText: {
    fontSize: 14,
    marginLeft: 12,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 8,
    marginHorizontal: 20,
  },
});

export default ProfileDropdown; 