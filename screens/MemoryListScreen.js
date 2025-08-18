import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useMemory } from '../context/MemoryContext';
import { useTheme } from '../context/ThemeContext';

const MemoryListScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('recent');
  const { currentUser } = useAuth();
  const { colors } = useTheme();
  const { 
    loading, 
    recentMemories, 
    importantMemories, 
    memoryEnabled,
    searchMemories,
    deleteMemory
  } = useMemory();

  // Display memories based on the active tab
  const displayMemories = activeTab === 'recent' 
    ? recentMemories 
    : activeTab === 'important' 
    ? importantMemories 
    : searchResults;

  // Combine recent and important memories, remove duplicates, and sort by importance
  const allMemories = React.useMemo(() => {
    const combined = [...importantMemories];
    
    // Add recent memories that aren't already in important memories
    recentMemories.forEach(recentMemory => {
      if (!combined.find(memory => memory.id === recentMemory.id)) {
        combined.push(recentMemory);
      }
    });
    
    // Sort by importance (high to low), then by creation date (recent to old)
    return combined.sort((a, b) => {
      if (b.importance !== a.importance) {
        return b.importance - a.importance;
      }
      
      // If same importance, sort by creation date
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return bDate - aDate;
    });
  }, [recentMemories, importantMemories]);

  // Handle memory search
  const handleSearch = async () => {
    if (!searchQuery.trim() || !memoryEnabled) return;
    
    setIsSearching(true);
    try {
      const results = await searchMemories(searchQuery);
      setSearchResults(results);
      setActiveTab('search');
    } catch (error) {
      console.error("Error searching memories:", error);
      Alert.alert('Hata', 'Arama sırasında bir hata oluştu.');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle memory deletion
  const handleDeleteMemory = (memoryId, memoryTopic) => {
    Alert.alert(
      'Anıyı Sil',
      `"${memoryTopic}" anısını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: () => deleteMemoryConfirmed(memoryId)
        }
      ]
    );
  };

  const deleteMemoryConfirmed = async (memoryId) => {
    try {
      const success = await deleteMemory(memoryId);
      
      if (success) {
        // If we were in search results, update the search results
        if (activeTab === 'search' && searchQuery) {
          const results = await searchMemories(searchQuery);
          setSearchResults(results);
        }
        Alert.alert('Başarılı', 'Anı başarıyla silindi.');
      } else {
        Alert.alert('Hata', 'Anı silinirken bir hata oluştu.');
      }
    } catch (error) {
      console.error("Error deleting memory:", error);
      Alert.alert('Hata', 'Anı silinirken bir hata oluştu.');
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // The MemoryContext will automatically refresh when the component re-mounts
    // or we could add a refresh function to the context
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const getMemoryIcon = (importance, topic) => {
    // Use importance and topic to determine icon
    if (importance >= 8) return 'star';
    if (importance >= 6) return 'heart';
    if (topic && topic.toLowerCase().includes('ad')) return 'person';
    if (topic && topic.toLowerCase().includes('tercih')) return 'settings';
    return 'document-text';
  };

  const getMemoryColor = (importance) => {
    if (importance >= 8) return '#FF6B6B'; // High importance - red
    if (importance >= 6) return '#4A90E2'; // Medium importance - blue
    return '#28A745'; // Lower importance - green
  };

  const formatMemoryDate = (timestamp) => {
    if (!timestamp) return 'Tarih bilinmiyor';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Tarih bilinmiyor';
    }
  };

  const renderMemory = ({ item }) => (
    <TouchableOpacity 
      style={styles.memoryCard}
      onPress={() => {
        Alert.alert(
          `${item.topic} (${item.importance}/10)`,
          item.content,
          [
            { text: 'Tamam', style: 'default' },
            ...(item.reasoning ? [{ 
              text: 'Detaylar', 
              onPress: () => Alert.alert('Neden Kaydedildi?', item.reasoning)
            }] : []),
            { 
              text: 'Sil', 
              style: 'destructive',
              onPress: () => handleDeleteMemory(item.id, item.topic)
            }
          ]
        );
      }}
    >
      <View style={styles.memoryHeader}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={getMemoryIcon(item.importance, item.topic)} 
            size={24} 
            color={getMemoryColor(item.importance)} 
          />
          <View style={[
            styles.importanceBadge, 
            { backgroundColor: getMemoryColor(item.importance) }
          ]}>
            <Text style={styles.importanceText}>{item.importance}</Text>
          </View>
        </View>
        <View style={styles.memoryInfo}>
          <Text style={styles.memoryTitle} numberOfLines={1}>
            {item.topic}
          </Text>
          <Text style={styles.memoryDate}>
            {formatMemoryDate(item.createdAt)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#7F8C8D" />
      </View>
      <Text style={styles.memoryPreview} numberOfLines={3}>
        {item.content}
      </Text>
      {item.reasoning && (
        <Text style={styles.memoryReasoning} numberOfLines={2}>
          💭 {item.reasoning}
        </Text>
      )}
    </TouchableOpacity>
  );

  // Check if user is authenticated and email verified
  if (!currentUser) {
    return (
      <View style={styles.authRequiredContainer}>
        <Ionicons name="lock-closed-outline" size={80} color="#7F8C8D" />
        <Text style={styles.authRequiredTitle}>Giriş Gerekli</Text>
        <Text style={styles.authRequiredText}>
          Anılarınızı görmek için lütfen giriş yapın.
        </Text>
        <TouchableOpacity 
          style={styles.authButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.authButtonText}>Giriş Yap</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentUser.emailVerified) {
    return (
      <View style={styles.authRequiredContainer}>
        <Ionicons name="mail-outline" size={80} color="#7F8C8D" />
        <Text style={styles.authRequiredTitle}>E-posta Doğrulaması</Text>
        <Text style={styles.authRequiredText}>
          Anılarınızı görmek için lütfen e-posta adresinizi doğrulayın.
        </Text>
      </View>
    );
  }

  if (!memoryEnabled) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="library-outline" size={80} color="#7F8C8D" />
        <Text style={styles.emptyTitle}>Hafıza Devre Dışı</Text>
        <Text style={styles.emptySubtitle}>
          Anı özelliği şu anda kapalı. Profil ayarlarınızdan açabilirsiniz.
        </Text>
        <TouchableOpacity 
          style={styles.startButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.startButtonText}>Ayarlara Git</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="library-outline" size={60} color="#4A90E2" />
        <Text style={styles.loadingText}>Anılar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {memoryEnabled && (
        <>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Anılarda ara..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              editable={!isSearching}
            />
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
            >
              <Ionicons 
                name={isSearching ? "hourglass-outline" : "search-outline"} 
                size={20} 
                color={isSearching || !searchQuery.trim() ? "#7F8C8D" : "#4A90E2"} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'recent' && styles.activeTab]}
              onPress={() => setActiveTab('recent')}
            >
              <Text style={[styles.tabText, activeTab === 'recent' && styles.activeTabText]}>
                Son Eklenenler
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'important' && styles.activeTab]}
              onPress={() => setActiveTab('important')}
            >
              <Text style={[styles.tabText, activeTab === 'important' && styles.activeTabText]}>
                Önemli
              </Text>
            </TouchableOpacity>
            {searchResults.length > 0 && (
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'search' && styles.activeTab]}
                onPress={() => setActiveTab('search')}
              >
                <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
                  Arama Sonuçları
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {activeTab === 'search' ? (
        displayMemories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={80} color="#7F8C8D" />
            <Text style={styles.emptyTitle}>Arama sonucu bulunamadı</Text>
            <Text style={styles.emptySubtitle}>
              Farklı anahtar kelimelerle tekrar deneyin.
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayMemories}
            renderItem={renderMemory}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )
      ) : (
        (activeTab === 'recent' ? recentMemories : importantMemories).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="library-outline" size={80} color="#7F8C8D" />
            <Text style={styles.emptyTitle}>
              {activeTab === 'recent' ? 'Son anı yok' : 'Önemli anı yok'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Terapi seanslarınıza başladığınızda TherapyAI önemli bulduğu konuları otomatik olarak anı olarak kaydedecek.
            </Text>
            <TouchableOpacity 
              style={styles.startButton}
              onPress={() => navigation.navigate('Chat')}
            >
              <Text style={styles.startButtonText}>Seans Başlat</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.headerInfo}>
              <Text style={styles.memoryCount}>
                {(activeTab === 'recent' ? recentMemories : importantMemories).length} anı kayıtlı
              </Text>
              <Text style={styles.memoryDescription}>
                AI tarafından önemli bulunan konulardan otomatik oluşturuldu
              </Text>
            </View>
            <FlatList
              data={activeTab === 'recent' ? recentMemories : importantMemories}
              renderItem={renderMemory}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            />
          </>
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  authRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F8F9FA',
  },
  authRequiredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 10,
  },
  authRequiredText: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  authButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  startButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerInfo: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  memoryCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  memoryDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 5,
  },
  listContainer: {
    padding: 15,
  },
  memoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  importanceBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  importanceText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  memoryInfo: {
    flex: 1,
  },
  memoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  memoryDate: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  memoryPreview: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 20,
    marginBottom: 8,
  },
  memoryReasoning: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
    lineHeight: 16,
    backgroundColor: '#F8F9FA',
    padding: 8,
    borderRadius: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#F8F9FA',
    marginRight: 10,
  },
  searchButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4A90E2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  activeTabText: {
    color: '#4A90E2',
  },
});

export default MemoryListScreen; 