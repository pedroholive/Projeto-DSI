
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';

export interface Glicemia {
  id?: string;
  userId: string;
  valor: number;
  data: string;
  horario: string;
  contexto: string;
  observacao?: string;
}

type DadosGlicemia = Pick<
  Glicemia,
  'valor' | 'data' | 'horario' | 'contexto' | 'observacao'
>;

// Validação dos dados de glicemia
function validarGlicemia(dados: DadosGlicemia) {
  if (!Number.isFinite(dados.valor) || dados.valor <= 0) {
    throw new Error('Informe um valor de glicemia válido.');
  }

  if (
    !dados.data.trim() ||
    !dados.horario.trim() ||
    !dados.contexto.trim()
  ) {
    throw new Error(
      'Preencha data, horário e contexto da medição.'
    );
  }
}

// CREATE - Criar um registro de glicemia
export async function criarGlicemia(
  glicemia: Glicemia
): Promise<void> {
  console.log('1 - Iniciando criação da glicemia');

  validarGlicemia(glicemia);

  if (!glicemia.userId.trim()) {
    throw new Error('Usuário não identificado.');
  }

  console.log('2 - Dados validados, enviando ao Firestore');

  try {
    await addDoc(collection(db, 'glicemias'), {
      userId: glicemia.userId,
      valor: glicemia.valor,
      data: glicemia.data.trim(),
      horario: glicemia.horario.trim(),
      contexto: glicemia.contexto.trim(),
      observacao: glicemia.observacao?.trim() ?? '',
      createdAt: serverTimestamp(),
    });

    console.log(
      '3 - Registro salvo no Firestore com sucesso'
    );
  } catch (error) {
    console.error('ERRO AO SALVAR GLICEMIA:', error);
    throw error;
  }
}

// READ - Listar os registros do usuário
export async function listarGlicemias(
  userId: string
): Promise<Glicemia[]> {
  console.log('Buscando registros de glicemia...');

  try {
    const glicemiaQuery = query(
      collection(db, 'glicemias'),
      where('userId', '==', userId)
    );

    const resultado = await getDocs(glicemiaQuery);

    const registros: Glicemia[] = resultado.docs.map(
      documento => ({
        id: documento.id,
        ...(documento.data() as Omit<Glicemia, 'id'>),
      })
    );

    console.log(
      'Registros encontrados:',
      registros.length
    );

    return registros;
  } catch (error) {
    console.error(
      'ERRO AO LISTAR GLICEMIAS:',
      error
    );
    throw error;
  }
}

// READ - Buscar um registro específico
export async function buscarGlicemiaPorId(
  glicemiaId: string,
  userId: string
): Promise<Glicemia | null> {
  try {
    const referencia = doc(
      db,
      'glicemias',
      glicemiaId
    );

    const resultado = await getDoc(referencia);

    if (!resultado.exists()) {
      return null;
    }

    if (resultado.data().userId !== userId) {
      return null;
    }

    return {
      id: resultado.id,
      ...(resultado.data() as Omit<Glicemia, 'id'>),
    };
  } catch (error) {
    console.error(
      'ERRO AO BUSCAR GLICEMIA:',
      error
    );
    throw error;
  }
}

// UPDATE - Atualizar um registro
export async function atualizarGlicemia(
  glicemiaId: string,
  userId: string,
  dadosAtualizados: DadosGlicemia
): Promise<void> {
  console.log('Iniciando atualização da glicemia...');

  validarGlicemia(dadosAtualizados);

  try {
    const referencia = doc(
      db,
      'glicemias',
      glicemiaId
    );

    const resultado = await getDoc(referencia);

    if (!resultado.exists()) {
      throw new Error(
        'Registro de glicemia não encontrado.'
      );
    }

    if (resultado.data().userId !== userId) {
      throw new Error(
        'Você não tem permissão para editar este registro.'
      );
    }

    await updateDoc(referencia, {
      valor: dadosAtualizados.valor,
      data: dadosAtualizados.data.trim(),
      horario: dadosAtualizados.horario.trim(),
      contexto: dadosAtualizados.contexto.trim(),
      observacao:
        dadosAtualizados.observacao?.trim() ?? '',
      updatedAt: serverTimestamp(),
    });

    console.log('Glicemia atualizada com sucesso');
  } catch (error) {
    console.error(
      'ERRO AO ATUALIZAR GLICEMIA:',
      error
    );
    throw error;
  }
}

// DELETE - Excluir um registro
export async function excluirGlicemia(
  glicemiaId: string,
  userId: string
): Promise<void> {
  console.log('Iniciando exclusão da glicemia...');

  try {
    const referencia = doc(
      db,
      'glicemias',
      glicemiaId
    );

    const resultado = await getDoc(referencia);

    if (!resultado.exists()) {
      throw new Error(
        'Registro de glicemia não encontrado.'
      );
    }

    if (resultado.data().userId !== userId) {
      throw new Error(
        'Você não tem permissão para excluir este registro.'
      );
    }

    await deleteDoc(referencia);

    console.log('Glicemia excluída com sucesso');
  } catch (error) {
    console.error(
      'ERRO AO EXCLUIR GLICEMIA:',
      error
    );
    throw error;
  }
}
