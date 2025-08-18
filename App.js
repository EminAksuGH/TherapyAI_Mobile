import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';

// Test Firebase import first
let auth, db;
try {
  const firebase = require('./firebase/firebase');
  auth = firebase.auth;
  db = firebase.db;
} catch (error) {
  console.error('Firebase import error:', error);
}

// Test Context imports
let AuthProvider, MemoryProvider, ThemeProvider;
try {
  AuthProvider = require('./context/AuthContext').AuthProvider;
  MemoryProvider = require('./context/MemoryContext').MemoryProvider;
  ThemeProvider = require('./context/ThemeContext').ThemeProvider;
} catch (error) {
  console.error('Context import error:', error);
}

// Screen imports (to be created)
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import ChatScreen from './screens/ChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import MemoryListScreen from './screens/MemoryListScreen';
import LoadingScreen from './screens/LoadingScreen';

const Stack = createStackNavigator();

// Theme-aware StatusBar component
const ThemedStatusBar = () => {
  let useTheme;
  try {
    useTheme = require('./context/ThemeContext').useTheme;
  } catch (error) {
    // Fallback if theme context is not available
    return <StatusBar style="auto" />;
  }

  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} backgroundColor={isDark ? "#121212" : "#F8F9FA"} />;
};

const AppNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="MemoryList" component={MemoryListScreen} />
      <Stack.Screen name="Loading" component={LoadingScreen} />
    </Stack.Navigator>
  );
};

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, marginBottom: 10 }}>Something went wrong!</Text>
          <Text style={{ color: 'red' }}>{this.state.error?.toString()}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {

  // If Firebase failed to load, show error
  if (!auth || !db) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, marginBottom: 10 }}>Firebase connection failed</Text>
        <Text style={{ color: 'red' }}>Check your .env file and restart the app</Text>
      </View>
    );
  }

  // If contexts failed to load, show error
  if (!AuthProvider || !MemoryProvider || !ThemeProvider) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, marginBottom: 10 }}>Context providers failed to load</Text>
        <Text style={{ color: 'red' }}>Check context files for errors</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <MemoryProvider>
            <NavigationContainer>
              <AppNavigator />
              <ThemedStatusBar />
            </NavigationContainer>
          </MemoryProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
