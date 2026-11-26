
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      initialRouteName="login"
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* NAVEGAÇÃO PRINCIPAL */}
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />

      <Stack.Screen
        name="cadastro"
        options={{
          headerShown: true,
          title: 'Criar Conta',
        }}
      />

      <Stack.Screen name="recuperar-senha" />

      {/* TELAS DO MÉDICO */}
      <Stack.Screen name="medico-home" />
      <Stack.Screen name="alertas-medico" />
      <Stack.Screen name="consultas-medico" />
      <Stack.Screen name="perfil-medico" />
      <Stack.Screen name="meus-pacientes" />
      <Stack.Screen name="glicemia-profissional" />
      <Stack.Screen name="pressao-profissional" />
      <Stack.Screen name="agendar-consulta-medica" />

      {/* DEMAIS TELAS */}
      <Stack.Screen name="novo-registro" />
      <Stack.Screen name="editar-pressao" />
      <Stack.Screen name="consultas/index" />
      <Stack.Screen name="consultas/nova" />
      <Stack.Screen name="consultas/editar" />
      <Stack.Screen name="consultas/detalhe" />
      <Stack.Screen name="meus-medicos" />
    </Stack>
  );
}
