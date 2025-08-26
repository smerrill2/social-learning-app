import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedFeedItem } from './AnimatedFeedItem';

interface PhilosopherContent {
  id: string;
  type: 'thinker' | 'concept' | 'quote' | 'insight';
  author: string;
  title: string;
  content: string;
  category: string;
  readTime: number;
  tags: string[];
  avatar?: string;
}

const philosopherData: PhilosopherContent[] = [
  {
    id: '1',
    type: 'thinker',
    author: 'Karl Marx',
    title: 'The Architect of Modern Social Theory',
    content: 'Karl Marx (1818-1883) revolutionized our understanding of economics, politics, and society. His analysis of capitalism, class struggle, and historical materialism laid the foundation for modern socialist thought. Marx argued that the history of all societies is the history of class struggles, where economic forces drive social change.',
    category: 'Political Philosophy',
    readTime: 3,
    tags: ['capitalism', 'socialism', 'class-struggle', 'economics'],
    avatar: '🧔'
  },
  {
    id: '2',
    type: 'concept',
    author: 'Karl Marx',
    title: 'Historical Materialism',
    content: 'Marx\'s theory that material conditions and economic factors are the primary drivers of historical change. Rather than ideas shaping reality, Marx argued that material reality shapes ideas. This perspective suggests that to understand any society, we must first examine its economic base and class relations.',
    category: 'Marxist Theory',
    readTime: 4,
    tags: ['materialism', 'history', 'economics', 'society'],
    avatar: '⚙️'
  },
  {
    id: '3',
    type: 'quote',
    author: 'Karl Marx',
    title: 'On Social Being and Consciousness',
    content: '"It is not the consciousness of men that determines their being, but, on the contrary, their social being that determines their consciousness." This foundational insight suggests that our thoughts, beliefs, and worldviews are shaped by our material conditions and social relationships.',
    category: 'Philosophy of Mind',
    readTime: 2,
    tags: ['consciousness', 'social-being', 'materialism'],
    avatar: '💭'
  },
  {
    id: '4',
    type: 'thinker',
    author: 'Carl Jung',
    title: 'Pioneer of Analytical Psychology',
    content: 'Carl Gustav Jung (1875-1961) founded analytical psychology and introduced groundbreaking concepts like the collective unconscious, archetypes, and psychological types. His work bridges psychology, spirituality, and philosophy, offering profound insights into the human psyche and the process of individuation.',
    category: 'Psychology',
    readTime: 3,
    tags: ['psychology', 'unconscious', 'archetypes', 'individuation'],
    avatar: '🧠'
  },
  {
    id: '5',
    type: 'concept',
    author: 'Carl Jung',
    title: 'The Collective Unconscious',
    content: 'Jung proposed that beyond our personal unconscious lies a deeper layer shared by all humanity - the collective unconscious. This contains universal patterns called archetypes, such as the Mother, the Hero, the Shadow, and the Self. These archetypes manifest in myths, dreams, and cultural symbols across all civilizations.',
    category: 'Jungian Psychology',
    readTime: 4,
    tags: ['collective-unconscious', 'archetypes', 'universal-patterns'],
    avatar: '🌀'
  },
  {
    id: '6',
    type: 'insight',
    author: 'Carl Jung',
    title: 'The Process of Individuation',
    content: 'Individuation is Jung\'s term for the psychological process of integrating the conscious and unconscious parts of the mind to achieve psychological wholeness. This journey involves confronting one\'s Shadow, integrating the Anima/Animus, and ultimately realizing the Self - the archetype of wholeness and unity.',
    category: 'Personal Development',
    readTime: 5,
    tags: ['individuation', 'shadow', 'anima', 'self-realization'],
    avatar: '🎭'
  },
  {
    id: '7',
    type: 'quote',
    author: 'Carl Jung',
    title: 'On the Shadow Self',
    content: '"Everyone carries a shadow, and the less it is embodied in the individual\'s conscious life, the blacker and denser it is." Jung believed that acknowledging and integrating our shadow - the parts of ourselves we reject or deny - is essential for psychological health and authentic self-expression.',
    category: 'Shadow Work',
    readTime: 3,
    tags: ['shadow', 'consciousness', 'integration', 'authenticity'],
    avatar: '🌑'
  },
  {
    id: '8',
    type: 'concept',
    author: 'Karl Marx',
    title: 'Alienation Under Capitalism',
    content: 'Marx identified four types of alienation workers experience under capitalism: from the product of their labor, from the act of production, from their human essence, and from other workers. This alienation leads to a sense of powerlessness and disconnection from meaningful work and community.',
    category: 'Labor Theory',
    readTime: 4,
    tags: ['alienation', 'capitalism', 'labor', 'workers'],
    avatar: '🏭'
  },
  {
    id: '9',
    type: 'insight',
    author: 'Carl Jung',
    title: 'Synchronicity and Meaning',
    content: 'Jung coined the term "synchronicity" to describe meaningful coincidences that cannot be explained by cause and effect. These acausal connections suggest a deeper order in the universe, where inner psychological states correspond with outer events, revealing the interconnectedness of psyche and world.',
    category: 'Depth Psychology',
    readTime: 3,
    tags: ['synchronicity', 'meaning', 'coincidence', 'interconnection'],
    avatar: '✨'
  },
  {
    id: '10',
    type: 'concept',
    author: 'Karl Marx & Carl Jung',
    title: 'Consciousness and Social Reality',
    content: 'While Marx emphasized how social conditions shape consciousness, Jung explored how unconscious patterns influence both individual and collective behavior. Together, their insights reveal the complex interplay between material reality, social structures, and the depths of human psychology.',
    category: 'Comparative Philosophy',
    readTime: 5,
    tags: ['consciousness', 'social-reality', 'psychology', 'materialism'],
    avatar: '🤝'
  }
];

interface Props {
  onScroll?: () => void;
}

export const DemoFeed: React.FC<Props> = ({ onScroll }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showContent, setShowContent] = useState(false);
  const [visibleItems, setVisibleItems] = useState<PhilosopherContent[]>([]);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (showContent) {
      // Simulate loading content as user scrolls
      loadContent();
    }
  }, [showContent]);

  const loadContent = () => {
    // Start with first few items
    setVisibleItems(philosopherData.slice(0, 3));
    setAnimationKey(prev => prev + 1);
    
    // Gradually load more content
    setTimeout(() => {
      setVisibleItems(philosopherData.slice(0, 6));
      setAnimationKey(prev => prev + 1);
    }, 1000);
    
    setTimeout(() => {
      setVisibleItems(philosopherData);
      setAnimationKey(prev => prev + 1);
    }, 2000);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setShowContent(true);
    }
  };

  const handleScroll = () => {
    if (!showContent) {
      setShowContent(true);
    }
    onScroll?.();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'thinker': return '👤';
      case 'concept': return '💡';
      case 'quote': return '💬';
      case 'insight': return '🔍';
      default: return '📚';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'thinker': return '#8b5cf6';
      case 'concept': return '#3b82f6';
      case 'quote': return '#10b981';
      case 'insight': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const renderPhilosopherItem = (item: PhilosopherContent, index: number) => (
    <AnimatedFeedItem
      key={`${item.id}-${animationKey}`}
      index={index}
      style={styles.itemContainer}
    >
      <View style={styles.philosopherCard}>
        <View style={styles.cardHeader}>
          <View style={styles.authorSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.avatar}</Text>
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{item.author}</Text>
              <View style={styles.metaRow}>
                <View style={[styles.typeTag, { backgroundColor: getTypeColor(item.type) + '20' }]}>
                  <Text style={[styles.typeText, { color: getTypeColor(item.type) }]}>
                    {getTypeIcon(item.type)} {item.type}
                  </Text>
                </View>
                <Text style={styles.readTime}>{item.readTime} min read</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.content}>{item.content}</Text>

        <View style={styles.categorySection}>
          <Text style={styles.category}>{item.category}</Text>
        </View>

        <View style={styles.tagsContainer}>
          {item.tags.map((tag, tagIndex) => (
            <View key={tagIndex} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </AnimatedFeedItem>
  );

  if (!showContent) {
    return (
      <ScrollView 
        style={styles.container}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.searchScrollContainer}
      >
        <View style={styles.searchContainer}>
          <View style={styles.searchHeader}>
            <Text style={styles.searchTitle}>Explore Great Thinkers</Text>
            <Text style={styles.searchSubtitle}>
              Discover insights from philosophy and psychology
            </Text>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Marx, Jung, or start scrolling..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>

          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Popular Topics:</Text>
            <View style={styles.suggestions}>
              {['Karl Marx', 'Carl Jung', 'Class Struggle', 'Collective Unconscious', 'Alienation', 'Individuation'].map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionChip}
                  onPress={() => {
                    setSearchQuery(suggestion);
                    setShowContent(true);
                  }}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.scrollHint}>
            <Ionicons name="arrow-down" size={24} color="#3b82f6" />
            <Text style={styles.scrollHintText}>Scroll down to explore content</Text>
          </View>
        </View>
        
        {/* Add some scrollable space to trigger the scroll */}
        <View style={styles.scrollTrigger}>
          <Text style={styles.scrollTriggerText}>Keep scrolling to see great thinkers...</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contentHeader}>
        <Text style={styles.contentTitle}>Great Thinkers & Ideas</Text>
        <Text style={styles.contentSubtitle}>
          {visibleItems.length} insights from Marx, Jung & more
        </Text>
      </View>

      <View style={styles.feedContainer}>
        {visibleItems.map((item, index) => renderPhilosopherItem(item, index))}
      </View>

      {visibleItems.length < philosopherData.length && (
        <View style={styles.loadingMore}>
          <Text style={styles.loadingText}>Loading more insights...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchScrollContainer: {
    flexGrow: 1,
    minHeight: '120%', // Make it taller than screen to enable scrolling
  },
  searchContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    minHeight: '90%', // Take up most of the screen
  },
  scrollTrigger: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    margin: 20,
    borderRadius: 12,
  },
  scrollTriggerText: {
    fontSize: 16,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  searchHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  searchTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  searchSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  suggestionsContainer: {
    marginBottom: 40,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  suggestionText: {
    fontSize: 14,
    color: '#374151',
  },
  scrollHint: {
    alignItems: 'center',
    gap: 8,
  },
  scrollHintText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  contentHeader: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  contentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  contentSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  feedContainer: {
    padding: 16,
  },
  itemContainer: {
    marginBottom: 16,
  },
  philosopherCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  readTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 24,
  },
  content: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  categorySection: {
    marginBottom: 12,
  },
  category: {
    fontSize: 13,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  loadingMore: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});
