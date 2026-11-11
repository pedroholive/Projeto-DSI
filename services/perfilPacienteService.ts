import {
  EmailAuthProvider, reauthenticateWithCredential, reload,
  signOut, updatePassword, verifyBeforeUpdateEmail,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '@/firebaseConfig';

export type PerfilPaciente = {
  nome: string;
  email: string;
  telefone: string;
  telefoneEmergencia: string;
  dataNascimento: string;
};
export type CampoPaciente = 'nome' | 'telefone' | 'telefoneEmergencia' | 'dataNascimento';

function usuarioAtual() {
  const usuario = auth.currentUser;
  if (!usuario) throw new Error('Entre na sua conta para continuar.');
  return usuario;
}

export function mascaraTelefonePaciente(valor: string) {
  const n = valor.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) return n ? `(${n}` : '';
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  const corte = n.length === 11 ? 7 : 6;
  return `(${n.slice(0, 2)}) ${n.slice(2, corte)}-${n.slice(corte)}`;
}

export function mascaraData(valor: string) {
  return valor.replace(/\D/g, '').slice(0, 8)
    .replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2');
}

export function validarCampo(campo: CampoPaciente, valor: string) {
  const texto = valor.trim();
  if (campo === 'nome' && (texto.length < 2 || texto.length > 100 ||
      !/^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '\-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/.test(texto))) {
    throw new Error('Digite um nome válido, com 2 a 100 caracteres.');
  }
  if (campo === 'telefone' || campo === 'telefoneEmergencia') {
    const numeros = texto.replace(/\D/g, '');
    if (numeros && (!/^[1-9]\d{9,10}$/.test(numeros) || /^(\d)\1+$/.test(numeros))) {
      throw new Error('Digite um telefone com DDD válido ou deixe o campo vazio.');
    }
  }
  if (campo === 'dataNascimento') {
    const [dia, mes, ano] = texto.split('/').map(Number);
    const data = new Date(ano, mes - 1, dia);
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(texto) || ano < 1900 ||
        data.getFullYear() !== ano || data.getMonth() !== mes - 1 ||
        data.getDate() !== dia || data > new Date()) {
      throw new Error('Digite uma data válida, de 01/01/1900 até hoje.');
    }
  }
  return texto;
}

export async function carregarPerfilPaciente(): Promise<PerfilPaciente> {
  const usuario = usuarioAtual();
  await reload(usuario);
  const snap = await getDoc(doc(db, 'usuarios', usuario.uid));
  if (!snap.exists() || snap.data().perfil !== 'patient') {
    throw new Error('Perfil de paciente não encontrado.');
  }
  const dados = snap.data();
  const email = usuario.email ?? '';
  // O novo e-mail só passa a valer depois da confirmação enviada pelo Firebase.
  if (email && email !== dados.email) {
    await updateDoc(snap.ref, { email });
  }
  return {
    nome: dados.nome ?? '', email,
    telefone: dados.telefone ?? '',
    telefoneEmergencia: dados.telefoneEmergencia ?? '',
    dataNascimento: dados.dataNascimento ?? '',
  };
}

export async function atualizarCampoPaciente(campo: CampoPaciente, valor: string) {
  const usuario = usuarioAtual();
  const texto = validarCampo(campo, valor);
  await updateDoc(doc(db, 'usuarios', usuario.uid), { [campo]: texto });
  return texto;
}

async function reautenticar(senhaAtual: string) {
  const usuario = usuarioAtual();
  if (!usuario.email || !usuario.providerData.some(p => p.providerId === 'password')) {
    throw new Error('Esta operação requer uma conta cadastrada com e-mail e senha.');
  }
  if (!senhaAtual) throw new Error('Digite sua senha atual.');
  await reauthenticateWithCredential(usuario,
    EmailAuthProvider.credential(usuario.email, senhaAtual));
  return usuario;
}

export async function alterarEmailPaciente(email: string, senhaAtual: string) {
  const novoEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novoEmail)) throw new Error('Digite um e-mail válido.');
  if (novoEmail === usuarioAtual().email?.toLowerCase()) throw new Error('Digite um e-mail diferente do atual.');
  const usuario = await reautenticar(senhaAtual);
  await verifyBeforeUpdateEmail(usuario, novoEmail);
}

export async function alterarSenhaPaciente(senhaAtual: string, novaSenha: string, confirmacao: string) {
  if (novaSenha.length < 6) throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
  if (novaSenha !== confirmacao) throw new Error('A confirmação da senha está diferente.');
  if (novaSenha === senhaAtual) throw new Error('Escolha uma senha diferente da atual.');
  const usuario = await reautenticar(senhaAtual);
  await updatePassword(usuario, novaSenha);
}

export async function excluirContaPaciente(senhaAtual: string) {
  const usuario = await reautenticar(senhaAtual);
  await usuario.getIdToken(true);
  await httpsCallable(functions, 'excluirContaPaciente', { timeout: 540000 })({ confirmar: true });
  await signOut(auth);
}

export function mensagemErroPerfil(erro: unknown) {
  const codigo = (erro as { code?: string })?.code;
  switch (codigo) {
    case 'auth/invalid-credential': case 'auth/wrong-password': return 'Senha atual incorreta. Confira e tente novamente.';
    case 'auth/email-already-in-use': return 'Esse e-mail já está vinculado a outra conta.';
    case 'auth/invalid-email': return 'Digite um e-mail válido.';
    case 'auth/weak-password': case 'auth/password-does-not-meet-requirements': return 'A senha não atende aos requisitos do Firebase. Escolha uma senha mais forte.';
    case 'auth/too-many-requests': return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
    case 'auth/requires-recent-login': return 'Entre na conta novamente e repita a operação.';
    case 'auth/network-request-failed': return 'Verifique sua conexão e tente novamente.';
    case 'permission-denied': return 'O Firebase bloqueou esta alteração. Confira as regras atualizadas do perfil.';
    case 'functions/not-found': case 'functions/unimplemented': return 'A função de exclusão ainda precisa ser publicada no Firebase.';
    case 'functions/internal': case 'functions/deadline-exceeded': return 'Não foi possível concluir a exclusão. Parte dos dados pode já ter sido removida; tente novamente para concluir.';
    default: return erro instanceof Error ? erro.message : 'Não foi possível concluir. Tente novamente.';
  }
}
