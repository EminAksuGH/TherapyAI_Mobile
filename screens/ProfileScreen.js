import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const ProfileScreen = ({ navigation }) => {
  const { currentUser, logout } = useAuth();
  const { colors } = useTheme();

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
              navigation.navigate('Home');
            } catch (error) {
              Alert.alert('Hata', 'Çıkış yapılamadı.');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={60} color="#4A90E2" />
        </View>
        <Text style={styles.displayName}>
          {currentUser?.displayName || 'Kullanıcı'}
        </Text>
        <Text style={styles.email}>{currentUser?.email}</Text>
        {!currentUser?.emailVerified && (
          <View style={styles.verificationBadge}>
            <Text style={styles.verificationText}>E-posta doğrulanmamış</Text>
          </View>
        )}
      </View>

      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="person-outline" size={24} color="#4A90E2" />
          <Text style={styles.menuText}>Profili Düzenle</Text>
          <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="lock-closed-outline" size={24} color="#4A90E2" />
          <Text style={styles.menuText}>Şifre Değiştir</Text>
          <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('MemoryList')}
        >
          <Ionicons name="library-outline" size={24} color="#4A90E2" />
          <Text style={styles.menuText}>Anılarım</Text>
          <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="settings-outline" size={24} color="#4A90E2" />
          <Text style={styles.menuText}>Ayarlar</Text>
          <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle-outline" size={24} color="#4A90E2" />
          <Text style={styles.menuText}>Yardım & Destek</Text>
          <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#E74C3C" />
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  profileHeader: {
    backgroundColor: 'white',
    alignItems: 'center',
    padding: 30,
    marginBottom: 20,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  verificationBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginTop: 10,
  },
  verificationText: {
    fontSize: 12,
    color: '#856404',
  },
  menuSection: {
    backgroundColor: 'white',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
    marginLeft: 15,
  },
  logoutButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  logoutText: {
    fontSize: 16,
    color: '#E74C3C',
    marginLeft: 15,
    fontWeight: '600',
  },
});

export default ProfileScreen; 