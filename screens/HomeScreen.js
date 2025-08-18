import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const HomeScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const { colors } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.heroSection, { backgroundColor: colors.background }]}>
        <Image 
          source={require('../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: colors.text }]}>TherapyAI'ya Hoş Geldiniz</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Gelişmiş yapay zeka ve şefkatli bakımın buluştuğu destekleyici bir alan keşfedin.
          Daha iyi bir ruh sağlığına giden yolculuğunuz burada başlıyor.
        </Text>
        
        {currentUser ? (
          <TouchableOpacity 
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Chat')}
          >
            <Text style={styles.ctaButtonText}>Sohbete Başla</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.ctaButtonText}>Başlayın</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.featuresSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Özellikler</Text>
        <FeatureCard 
          icon="chatbubbles-outline"
          title="AI Terapi Seansları"
          description="7/24 erişilebilir yapay zeka destekli terapi desteği. Profesyonel destek her zaman yanınızda."
          color={colors.primary}
          colors={colors}
        />
        <FeatureCard 
          icon="shield-checkmark-outline"
          title="Güvenli ve Gizli"
          description="Konuşmalarınız uçtan uca şifreleme ile korunur. Mahremiyetiniz bizim önceliğimiz."
          color={colors.success}
          colors={colors}
        />
        <FeatureCard 
          icon="library-outline"
          title="Kişisel Hatıralar"
          description="AI asistanınız sizi hatırlar ve kişiselleştirilmiş destek sağlar."
          color={colors.info}
          colors={colors}
        />
        <FeatureCard 
          icon="trending-up-outline"
          title="Sürekli Gelişim"
          description="Her konuşmayla gelişen, öğrenen ve daha iyi destek veren AI teknolojisi."
          color={colors.warning}
          colors={colors}
        />
      </View>

      <View style={styles.actionSection}>
        {currentUser && currentUser.emailVerified ? (
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Chat')}
          >
            <Text style={styles.buttonText}>Seansınızı Başlatın</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        ) : (
          <View style={styles.authButtons}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.buttonText}>Giriş Yap</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Signup')}
            >
              <Text style={styles.secondaryButtonText}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {currentUser && currentUser.emailVerified && (
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('MemoryList')}
          >
            <Ionicons name="library-outline" size={24} color="#4A90E2" />
            <Text style={styles.quickActionText}>Anılarım</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-outline" size={24} color="#4A90E2" />
            <Text style={styles.quickActionText}>Profil</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const FeatureCard = ({ icon, title, description, color, colors }) => (
  <View style={[
    styles.featureCard, 
    { 
      backgroundColor: colors.surface,
      borderColor: colors.border
    }
  ]}>
    <View style={[styles.featureIconContainer, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={40} color={color} />
    </View>
    <Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text>
    <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>{description}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    padding: 24,
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  ctaButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 50,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
  },
  featureCard: {
    padding: 24,
    marginBottom: 20,
    borderRadius: 15,
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  featureIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  authButtons: {
    gap: 15,
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#4A90E2',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 15,
    marginBottom: 30,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
});

export default HomeScreen; 