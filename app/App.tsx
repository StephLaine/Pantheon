import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Cinzel_600SemiBold,
  Cinzel_700Bold,
} from '@expo-google-fonts/cinzel';
import { CinzelDecorative_700Bold } from '@expo-google-fonts/cinzel-decorative';
import {
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import {
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';

import HomeScreen from './src/screens/HomeScreen';
import SoloMapScreen from './src/screens/SoloMapScreen';
import LevelQuizScreen from './src/screens/LevelQuizScreen';
import Level2QuizScreen from './src/screens/Level2QuizScreen';
import Level3QuizScreen from './src/screens/Level3QuizScreen';
import Level4QuizScreen from './src/screens/Level4QuizScreen';
import Level5QuizScreen from './src/screens/Level5QuizScreen';
import Level6QuizScreen from './src/screens/Level6QuizScreen';
import Level7QuizScreen from './src/screens/Level7QuizScreen';
import Level8QuizScreen from './src/screens/Level8QuizScreen';
import Level9QuizScreen from './src/screens/Level9QuizScreen';
import Level10QuizScreen from './src/screens/Level10QuizScreen';
import PlaceholderScreen from './src/screens/PlaceholderScreen';
import AuthScreen from './src/screens/AuthScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import SyncIssueBanner from './src/components/SyncIssueBanner';
import { colors } from './src/theme';
import { configureAudioSession } from './src/audio/sound';
import { supabase } from './src/lib/supabase';
import { useGameStore } from './src/state/game';

configureAudioSession();

const Tab = createBottomTabNavigator();
const PlayStack = createNativeStackNavigator();

// Play tab is its own stack so a level node can push the quiz screen with a
// real back gesture, instead of the map screen owning quiz state itself
function PlayStackNavigator() {
  return (
    <PlayStack.Navigator screenOptions={{ headerShown: false }}>
      <PlayStack.Screen name="SoloMap" component={SoloMapScreen} />
      <PlayStack.Screen name="LevelQuiz" component={LevelQuizScreen} />
      <PlayStack.Screen name="Level2Quiz" component={Level2QuizScreen} />
      <PlayStack.Screen name="Level3Quiz" component={Level3QuizScreen} />
      <PlayStack.Screen name="Level4Quiz" component={Level4QuizScreen} />
      <PlayStack.Screen name="Level5Quiz" component={Level5QuizScreen} />
      <PlayStack.Screen name="Level6Quiz" component={Level6QuizScreen} />
      <PlayStack.Screen name="Level7Quiz" component={Level7QuizScreen} />
      <PlayStack.Screen name="Level8Quiz" component={Level8QuizScreen} />
      <PlayStack.Screen name="Level9Quiz" component={Level9QuizScreen} />
      <PlayStack.Screen name="Level10Quiz" component={Level10QuizScreen} />
    </PlayStack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Cinzel_600SemiBold,
    Cinzel_700Bold,
    CinzelDecorative_700Bold,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });

  // undefined = still checking for a persisted session, null = signed out
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const storeLoading = useGameStore((s) => s.loading);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      useGameStore.getState().hydrate(session.user.id);
    } else if (session === null) {
      useGameStore.getState().clearLocal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const showLoading = !fontsLoaded || session === undefined || (!!session && storeLoading);

  const linking = {
    prefixes: [],
    config: {
      screens: {
        Home: 'home',
        Play: 'play',
        Ranking: 'ranking',
        Rewards: 'rewards',
        Profile: 'profile',
      },
    },
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {showLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.skyTop }}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      ) : passwordRecovery ? (
        <ResetPasswordScreen onDone={() => setPasswordRecovery(false)} />
      ) : !session ? (
        <AuthScreen />
      ) : (
        <>
          <NavigationContainer linking={linking}>
            <Tab.Navigator
              screenOptions={{ headerShown: false }}
              tabBar={() => null}
            >
              <Tab.Screen name="Home" component={HomeScreen} />
              <Tab.Screen name="Play" component={PlayStackNavigator} />
              <Tab.Screen name="Ranking">
                {() => <PlaceholderScreen title="Classement" />}
              </Tab.Screen>
              <Tab.Screen name="Rewards">
                {() => <PlaceholderScreen title="Récompenses" />}
              </Tab.Screen>
              <Tab.Screen name="Profile">
                {() => <PlaceholderScreen title="Profil" />}
              </Tab.Screen>
            </Tab.Navigator>
          </NavigationContainer>
          <SyncIssueBanner />
        </>
      )}
    </SafeAreaProvider>
  );
}
