import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  Platform,
} from 'react-native';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth, db } from '../firebaseConfig';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const router = useRouter();

  // REALIZAR LOGIN
  
async function handleLogin() {
  console.log('[LOGIN] Botão pressionado');

  if (!email.trim() || !senha) {
    const mensagem = 'Preencha e-mail e senha.';

    if (Platform.OS === 'web') {
      window.alert(mensagem);
    } else {
      Alert.alert('Atenção', mensagem);
    }

    return;
  }

  setCarregando(true);

  let etapa = 'Autenticação';

  // Limite de espera para identificar operações travadas.
  function comTimeout<T>(
    operacao: Promise<T>,
    nome: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Tempo de espera excedido em: ${nome}`
          )
        );
      }, 15000);

      operacao.then(
        (resultado) => {
          clearTimeout(timeout);
          resolve(resultado);
        },
        (erro) => {
          clearTimeout(timeout);
          reject(erro);
        }
      );
    });
  }

  try {
    console.log('[LOGIN] 1. Autenticando usuário...');

    const credencial = await comTimeout(
      signInWithEmailAndPassword(
        auth,
        email.trim(),
        senha
      ),
      'Firebase Authentication'
    );

    console.log('[LOGIN] 2. Autenticação concluída');

    etapa = 'Leitura do perfil';

    console.log('[LOGIN] 3. Buscando perfil no Firestore...');

    const perfilRef = doc(
      db,
      'usuarios',
      credencial.user.uid
    );

    const perfilSnapshot = await comTimeout(
      getDoc(perfilRef),
      'Cloud Firestore'
    );

    console.log('[LOGIN] 4. Perfil consultado');
    console.log(
      '[LOGIN] Documento existe:',
      perfilSnapshot.exists()
    );

    const perfil = perfilSnapshot.exists()
      ? perfilSnapshot.data()
      : null;

    etapa = 'Navegação';

    console.log(
      '[LOGIN] 5. Tipo de perfil:',
      perfil?.perfil
    );

    if (perfil?.perfil === 'professional') {
      router.replace('/medico-home');
    } else {
      router.replace('/(tabs)');
    }

    console.log('[LOGIN] Navegação solicitada');

  } catch (error: any) {
    console.error('[LOGIN] ETAPA COM ERRO:', etapa);
    console.error('[LOGIN] ERRO COMPLETO:', error);
    console.error('[LOGIN] CÓDIGO:', error?.code);
    console.error('[LOGIN] MENSAGEM:', error?.message);

    const mensagem =
      `Etapa: ${etapa}\n` +
      `Código: ${error?.code ?? 'desconhecido'}\n` +
      `Mensagem: ${error?.message ?? 'Erro desconhecido'}`;

    if (Platform.OS === 'web') {
      window.alert(mensagem);
    } else {
      Alert.alert('Erro ao entrar', mensagem);
    }

  } finally {
    console.log('[LOGIN] Finalizando tentativa');
    setCarregando(false);
  }
}


  return (
    <SafeAreaView style={styles.container}>
      
      {/* Bloco 1: Ícone e Textos de Apresentação */}
      <View style={styles.cabecalho}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo-healthsync.png')}
            style={styles.logoImagem}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.titulo}>Health Sync</Text>
        <Text style={styles.subtitulo}>
          Sua vida em equilíbrio. Monitoramento{'\n'}contínuo de diabetes e hipertensão.
        </Text>
      </View>

      {/* Bloco 2: Formulário */}
      <Text style={styles.label}>E-mail</Text>
      <TextInput
        style={styles.inputSimples}
        placeholder="paciente@healthsync.com.br"
        placeholderTextColor="#8A9A96"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Senha</Text>
      <View style={styles.containerSenha}>
        <TextInput
          style={styles.inputInterno}
          placeholder="••••••••••••"
          placeholderTextColor="#8A9A96"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry={!mostrarSenha} // Usa o estado para mostrar/esconder
        />
        <Pressable 
          style={styles.iconeOlho} 
          onPress={() => setMostrarSenha(!mostrarSenha)}
        >
          <Ionicons 
            name={mostrarSenha ? "eye-off-outline" : "eye-outline"} 
            size={22} 
            color="#8A9A96" 
          />
        </Pressable>
      </View>

      {/* Bloco 3: Esqueci minha senha */}
      <Link href="/recuperar-senha" style={styles.containerEsqueciSenha}>
        <Text style={styles.esqueciSenha}>Esqueci minha senha</Text>
      </Link>
      
      {/* Bloco 4: Botões e Cadastro */}
      <Pressable style={styles.botao} onPress={handleLogin} disabled={carregando}>
        <Text style={styles.botaoTexto}>
          {carregando ? 'Entrando...' : 'Entrar no aplicativo'}
        </Text>
      </Pressable>

      <View style={styles.containerCadastro}>
        <Text style={styles.textoNeutro}>Não tem conta? </Text>
        <Link href="/cadastro" asChild>
          <Pressable>
            <Text style={styles.textoDestaque}>Cadastre-se</Text>
          </Pressable>
        </Link>
      </View>

      {/* Bloco 5: Rodapé */}
      <View style={styles.rodape}>
        <Text style={styles.textoRodape}>
          Sua rotina de saúde sincronizada em um só lugar.
        </Text>
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    paddingHorizontal: 24, 
    backgroundColor: '#F4F8F7' // Fundo off-white esverdeado da imagem
  },
  
  // Cabeçalho e Logo
  cabecalho: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    backgroundColor: '#DCEAE7', // fundo claro, não mais verde escuro
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
},
  logoImagem: {
    width: 44,
    height: 44,
},
  titulo: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#0E766D', 
    marginBottom: 8 
  },
  subtitulo: { 
    fontSize: 14, 
    color: '#8A9A96', 
    textAlign: 'center',
    lineHeight: 20,
  },

  // Inputs
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333E3C',
    marginBottom: 6,
  },
  inputSimples: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    height: 52, 
    marginBottom: 20, 
    fontSize: 15, 
    borderColor: '#E0EAE8', 
    borderWidth: 1,
  },
  
  // Container especial da senha
  containerSenha: {
    flexDirection: 'row', // Coloca o input e o ícone lado a lado
    alignItems: 'center', // Centraliza verticalmente
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    height: 52, 
    borderColor: '#E0EAE8', 
    borderWidth: 1,
    marginBottom: 8,
  },
  inputInterno: {
    flex: 1, // Faz o input esticar até o botão do olho
    paddingHorizontal: 16,
    fontSize: 15,
  },
  iconeOlho: {
    padding: 12,
  },

  // Esqueci minha senha
  containerEsqueciSenha: {
    alignItems: 'flex-end',
    marginBottom: 32,
  },
  esqueciSenha: {
    color: '#0E766D',
    fontSize: 13,
    fontWeight: '500',
  },

  // Botão Principal
  botao: { 
    backgroundColor: '#0E766D', 
    borderRadius: 26, 
    height: 52, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 24,
  },
  botaoTexto: { 
    color: '#FFFFFF', 
    fontWeight: '600', 
    fontSize: 15 
  },

  // Cadastro
  containerCadastro: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  textoNeutro: {
    color: '#8A9A96',
    fontSize: 14,
  },
  textoDestaque: {
    color: '#0E766D',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Rodapé
  rodape: {
    alignItems: 'center',
    marginTop: 'auto', // Empurra pro fundo
    marginBottom: 30,
  },
  textoRodape: {
    color: '#B0BCB9',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  }
});