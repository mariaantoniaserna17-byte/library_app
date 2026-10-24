import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Pressable } from 'react-native';
import { migrateDbIfNeeded } from '@/db/migrations';
import { ThemedText } from '@/components/themed-text';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { DataProvider } from '@/providers/data-provider';

// La pantalla de carga nativa permanece hasta saber si hay una sesión guardada.
SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { status, signOut } = useAuth();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') return null;

  const signedIn = status === 'signedIn';

  return (
    <Stack>
      {/* Rutas protegidas (semana 10): el guard decide qué pantallas existen según la sesión. */}
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ title: 'Crear cuenta' }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn}>
        <Stack.Screen
          name="(tabs)"
          options={{
            title: 'Catálogo',
            headerRight: () => (
              <Pressable
                onPress={() => void signOut()}
                accessibilityRole="button"
                accessibilityLabel="Cerrar sesión">
                <ThemedText type="linkPrimary">Salir</ThemedText>
              </Pressable>
            ),
          }}
        />
        <Stack.Screen name="book/[id]" options={{ title: 'Detalle del libro' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="library.db" onInit={migrateDbIfNeeded}>
      <AuthProvider>
        <DataProvider>
          <RootStack />
        </DataProvider>
      </AuthProvider>
    </SQLiteProvider>
  );
}
