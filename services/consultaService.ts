import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export interface Consulta {
  id?: string;
  userId: string;
  especialidade: string;
  medico: string;
  data: string;
  horario: string;
  local: string;
  observacao?: string;
}

export async function criarConsulta(
  consulta: Consulta
): Promise<void> {
  try {
    await addDoc(collection(db, 'consultas'), {
      userId: consulta.userId,
      especialidade: consulta.especialidade,
      medico: consulta.medico,
      data: consulta.data,
      horario: consulta.horario,
      local: consulta.local,
      observacao: consulta.observacao ?? '',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Erro ao criar consulta:', error);
    throw error;
  }
}

export async function listarConsultas(
  userId: string
): Promise<Consulta[]> {
  try {
    const consultaQuery = query(
      collection(db, 'consultas'),
      where('userId', '==', userId)
    );

    const resultado = await getDocs(consultaQuery);

    const consultas: Consulta[] = resultado.docs.map((documento) => ({
      id: documento.id,
      ...(documento.data() as Omit<Consulta, 'id'>),
    }));

    return consultas;
  } catch (error) {
    console.error('Erro ao listar consultas:', error);
    throw error;
  }
}


export async function buscarConsultaPorId(
  consultaId: string,
  userId: string
): Promise<Consulta | null> {
  const referencia = doc(db, 'consultas', consultaId);
  const resultado = await getDoc(referencia);

  if (!resultado.exists()) {
    return null;
  }

  const dados = resultado.data();

  // Impede que a aplicação carregue dados de outro usuário.
  if (dados.userId !== userId) {
    return null;
  }

  return {
    id: resultado.id,
    ...dados,
  } as Consulta;
}

export async function atualizarConsulta(
  consultaId: string,
  userId: string,
  dadosAtualizados: Pick<
    Consulta,
    | 'especialidade'
    | 'medico'
    | 'data'
    | 'horario'
    | 'local'
    | 'observacao'
  >
): Promise<void> {
  const referencia = doc(db, 'consultas', consultaId);

  const resultado = await getDoc(referencia);

  if (!resultado.exists()) {
    throw new Error('Consulta não encontrada.');
  }

  if (resultado.data().userId !== userId) {
    throw new Error('Você não tem permissão para editar esta consulta.');
  }

  await updateDoc(referencia, {
    especialidade: dadosAtualizados.especialidade.trim(),
    medico: dadosAtualizados.medico.trim(),
    data: dadosAtualizados.data.trim(),
    horario: dadosAtualizados.horario.trim(),
    local: dadosAtualizados.local.trim(),
    observacao: dadosAtualizados.observacao?.trim() ?? '',
    updatedAt: serverTimestamp(),
  });
}


export async function excluirConsulta(
  consultaId: string,
  userId: string
): Promise<void> {
  try {
    // Referência ao documento da consulta
    const referencia = doc(db, 'consultas', consultaId);

    // Verificar se a consulta existe
    const resultado = await getDoc(referencia);

    if (!resultado.exists()) {
      throw new Error('Consulta não encontrada.');
    }

    // Verificar se a consulta pertence ao usuário
    if (resultado.data().userId !== userId) {
      throw new Error(
        'Você não tem permissão para excluir esta consulta.'
      );
    }

    // Excluir o documento do Firestore
    await deleteDoc(referencia);

    console.log('Consulta excluída com sucesso!');
  } catch (error) {
    console.error('Erro ao excluir consulta:', error);
    throw error;
  }
}
