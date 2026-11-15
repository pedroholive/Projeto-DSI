
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { auth, db } from '@/firebaseConfig';

export const ESPECIALIDADES = [
  'Médico',
  'Fisioterapeuta',
  'Enfermeiro',
  'Nutricionista',
  'Outros',
] as const;

export interface DadosPerfilMedico {
  nome: string;
  telefone: string;
  especialidade: string;
  crm: string;
}

export function mascaraTelefone(valor: string): string {
  const numeros = valor.replace(/\D/g, '').slice(0, 11);

  if (numeros.length <= 2) {
    return numeros ? `(${numeros}` : '';
  }

  if (numeros.length <= 7) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function telefoneValido(valor: string): boolean {
  const numeros = valor.replace(/\D/g, '');

  return (
    numeros.length === 11 &&
    numeros[0] !== '0' &&
    numeros[2] === '9' &&
    !/^(\d)\1+$/.test(numeros)
  );
}

function nomeValido(valor: string): boolean {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ]+(\s[A-Za-zÀ-ÖØ-öø-ÿ]+)*$/.test(
    valor.trim()
  );
}

function crmValido(valor: string): boolean {
  const crm = valor.trim();

  return (
    crm.length >= 4 &&
    crm.length <= 20 &&
    /^[A-Za-z0-9][A-Za-z0-9\s\-/.]*$/.test(crm)
  );
}

export async function atualizarPerfilMedico(
  uid: string,
  dados: DadosPerfilMedico
): Promise<void> {
  const usuario = auth.currentUser;

  if (!uid.trim() || !usuario || usuario.uid !== uid) {
    throw new Error('Profissional não autenticado.');
  }

  const nome = dados.nome.trim();
  const telefone = mascaraTelefone(dados.telefone);
  const especialidade = dados.especialidade.trim();
  const crm = dados.crm.trim().toUpperCase();

  if (!nomeValido(nome)) {
    throw new Error(
      'Digite um nome válido, utilizando apenas letras.'
    );
  }

  if (!telefoneValido(telefone)) {
    throw new Error('Digite um número de telefone válido.');
  }

  if (
    !(ESPECIALIDADES as readonly string[]).includes(
      especialidade
    )
  ) {
    throw new Error('Selecione uma especialidade válida.');
  }

  if (!crmValido(crm)) {
    throw new Error('Digite um CRM válido (ex.: 123456-SP).');
  }

  await updateDoc(doc(db, 'usuarios', uid), {
    nome,
    telefone,
    especialidade,
    crm,
  });

  await updateProfile(usuario, {
    displayName: nome,
  }).catch(() => undefined);
}

export async function excluirContaMedico(): Promise<void> {
  const usuario = auth.currentUser;

  if (!usuario) {
    throw new Error('Nenhum usuário autenticado.');
  }

  const functions = getFunctions(auth.app);

  const excluir = httpsCallable<
    { confirmar: boolean },
    { sucesso: boolean }
  >(
    functions,
    'excluirContaProfissional',
    { timeout: 540000 }
  );

  await excluir({
    confirmar: true,
  });
}
