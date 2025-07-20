import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Dimensions, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDarkMode } from './DarkModeContext';

const { width, height } = Dimensions.get('window');
const GITHUB_URL = 'https://github.com/leecheeyong/custom_api_dashboard_app';
const COMMUNITY_WIDGETS_URL = 'https://github.com/leecheeyong/community-widgets'

const onboardingData = [
  {
    title: 'Create Custom Widgets',
    description: 'Build widgets that connect to any API endpoint and display your data exactly how you want it.',
    icon: '📊',
    color: '#3B82F6',
  },
  {
    title: 'Real-time Updates',
    description: 'Your widgets automatically refresh to show the latest data from your APIs in real-time.',
    icon: '⚡',
    color: '#14B8A6',
  },
  {
    title: 'Community Widgets Library',
    description: 'Discover and install widgets created by the community, or share your own creations.',
    icon: '🌐',
    color: '#F97316',
    library: true
  },
  {
    title: 'Feature Request & Bug Report',
    description: 'Have an idea or found a bug? Let me know and help improve the app for everyone.',
    icon: '💡',
    color: '#3B82F6',
    github: true
  },
  {
    title: 'Get Started',
    description: 'Let\'s build something amazing together!',
    icon: '🚀',
    color: '#F59E0B',
  }
];

export default function WelcomeScreen() {
  const { isDarkMode } = useDarkMode();
  const [currentStep, setCurrentStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const stepRef = useRef(0);

  const onMomentumScrollEnd = (event: any) => {
    const step = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentStep(step);
    stepRef.current = step;
  };

  const nextStep = () => {
    if (stepRef.current < onboardingData.length - 1) {
      const next = stepRef.current + 1;
      scrollRef.current?.scrollTo({ x: width * next, animated: true });
      setCurrentStep(next);
      stepRef.current = next;
    } else {
      router.replace('/');
    }
  };

  const skip = () => {
    router.replace('/');
  };

  return (
    <LinearGradient
      colors={isDarkMode ? ['#18181b', '#23232a'] : ['#f8fafc', '#e2e8f0']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={skip} style={styles.skipButton}>
          <Text style={[styles.skipText, isDarkMode && { color: '#a1a1aa' }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        style={styles.carouselContainer}
      >
        {onboardingData.map((item, index) => (
          <View key={index} style={styles.slide}>
            <View style={styles.iconContainer}>
              <View style={[styles.iconBackground, { backgroundColor: item.color + '20' }]}>
                <Text style={styles.iconText}>{item.icon}</Text>
              </View>
            </View>
            <Text style={[styles.title, isDarkMode && { color: '#f1f5f9' }]}>{item.title}</Text>
            <Text style={[styles.description, isDarkMode && { color: '#a1a1aa' }]}>{item.description}</Text>
            {item.github && (
              <TouchableOpacity
                style={[styles.githubButton, isDarkMode && { backgroundColor: '#23232a', borderColor: '#3B82F6' }]}
                onPress={() => Linking.openURL(GITHUB_URL)}
              >
                <Text style={[styles.githubButtonText, isDarkMode && { color: '#60a5fa' }]}>
                  Learn more on GitHub
                </Text>
              </TouchableOpacity>
            )}
            {item.library && (
              <TouchableOpacity
                style={[styles.githubButton, isDarkMode && { backgroundColor: '#23232a', borderColor: '#3B82F6' }]}
                onPress={() => Linking.openURL(COMMUNITY_WIDGETS_URL)}
              >
                <Text style={[styles.githubButtonText, isDarkMode && { color: '#60a5fa' }]}>
                  Contribute to Library
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentStep && styles.paginationDotActive,
                isDarkMode && { backgroundColor: index === currentStep ? '#60a5fa' : '#27272a' }
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={[styles.nextButton, isDarkMode && { backgroundColor: '#60a5fa' }]} onPress={nextStep}>
          <Text style={[styles.nextButtonText, isDarkMode && { color: 'white' }]}>
            {currentStep === onboardingData.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: 'flex-end',
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  carouselContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  slide: {
    width: width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 40,
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#3B82F6',
    width: 24,
  },
  nextButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  githubButton: {
    marginTop: 18,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  githubButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 15,
  },
});