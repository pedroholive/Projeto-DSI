import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack initialRouteName="login">
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="cadastro" options={{ title: 'Criar Conta' }} />
      <Stack.Screen name="medico-home" options={{ headerShown: false }} />
      <Stack.Screen name="recuperar-senha" options={{ headerShown: false }} />
    </Stack>
  );
}