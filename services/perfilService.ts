import { deleteUser, updateProfile } from 'firebase/auth';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';

import { auth, db } from '@/firebaseConfig';

// Especialidades disponíveis para o profissional de saúde.
// Mesma lista utilizada na tela de cadastro.
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

// Mesma máscara de telefone utilizada no cadastro: (99) 99999-9999.
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

// Mesma validação de telefone utilizada no cadastro.
function telefoneValido(valor: string): boolean {
  const numeros = valor.replace(/\D/g, '');

  return (
    numeros.length === 11 &&
    numeros[0] !== '0' &&
    numeros[2] === '9' &&
    !/^(\d)\1+$/.test(numeros)
  );
}

// Mesma validação de nome utilizada no cadastro.
function nomeValido(valor: string): boolean {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ]+(\s[A-Za-zÀ-ÖØ-öø-ÿ]+)*$/.test(
    valor.trim()
  );
}

// Aceita os formatos comuns de CRM (números, UF, barras e hífens).
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
  if (!uid.trim()) {
    throw new Error('Médico não identificado.');
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

  // Mantém o nome de exibição do Authentication sincronizado.
  // Uma falha aqui não deve impedir a atualização do perfil.
  const usuario = auth.currentUser;

  if (usuario && usuario.uid === uid) {
    await updateProfile(usuario, { displayName: nome }).catch(
      () => undefined
    );
  }
}

export async function excluirContaMedico(): Promise<void> {
  const usuario = auth.currentUser;

  if (!usuario) {
    throw new Error('Nenhum usuário autenticado.');
  }

  // Remove primeiro os dados do Firestore e só depois a conta
  // do Authentication (a exclusão da conta encerra a sessão).
  await deleteDoc(doc(db, 'usuarios', usuario.uid));
  await deleteUser(usuario);
}
