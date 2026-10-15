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
  runTransaction,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, auth} from '@/firebaseConfig';


export type StatusConsulta =
  | 'registro_pessoal'
  | 'aguardando_confirmacao'
  | 'confirmada'
  | 'recusada'
  | 'cancelada';

export type OrigemConsulta = 'pessoal' | 'medico';

export interface Consulta {
  id?: string;
  userId: string;

  especialidade: string;
  medico: string;
  data: string;
  horario: string;
  local: string;
  observacao?: string;

  pacienteId?: string;
  medicoId?: string | null;
  criadoPorId?: string;
  origem?: OrigemConsulta;
  status?: StatusConsulta;
}


export interface DadosConsultaMedica {
  pacienteId: string;
  especialidade: string;
  data: string;
  horario: string;
  local: string;
  observacao?: string;
}

export async function criarConsultaMedica(
  dados: DadosConsultaMedica
): Promise<void> {
  const medicoId = auth.currentUser?.uid;

  if (!medicoId) {
    throw new Error('Médico não autenticado.');
  }

  if (
    !dados.pacienteId ||
    !dados.especialidade.trim() ||
    !dados.data.trim() ||
    !dados.horario.trim() ||
    !dados.local.trim()
  ) {
    throw new Error('Preencha os campos obrigatórios.');
  }

  // Estrutura de vínculo proposta:
  // vinculos/{medicoId}_{pacienteId}
  const vinculoId = `${medicoId}_${dados.pacienteId}`;

  const vinculoRef = doc(db, 'vinculos', vinculoId);
  const vinculoSnapshot = await getDoc(vinculoRef);

  if (
    !vinculoSnapshot.exists() ||
    vinculoSnapshot.data().status !== 'ativo' ||
    vinculoSnapshot.data().profissionalId !== medicoId ||
    vinculoSnapshot.data().pacienteId !== dados.pacienteId
  ) {
    throw new Error(
      'O paciente não possui vínculo ativo com este profissional.'
    );
}

  const medicoSnapshot = await getDoc(
    doc(db, 'usuarios', medicoId)
  );

  if (
    !medicoSnapshot.exists() ||
    medicoSnapshot.data().perfil !== 'professional' ||
    medicoSnapshot.data().especialidade !== 'Médico' ||
    medicoSnapshot.data().verificado !== true
  ) {
    throw new Error('Conta médica não verificada.');
  }

  const nomeMedico =
    medicoSnapshot.data().nome ?? 'Médico responsável';

  await addDoc(collection(db, 'consultas'), {
    // Compatibilidade com a listagem atual
    userId: dados.pacienteId,

    pacienteId: dados.pacienteId,
    medicoId,
    criadoPorId: medicoId,

    origem: 'medico',
    status: 'aguardando_confirmacao',

    especialidade: dados.especialidade.trim(),
    medico: nomeMedico,
    data: dados.data.trim(),
    horario: dados.horario.trim(),
    local: dados.local.trim(),
    observacao: dados.observacao?.trim() ?? '',

    createdAt: serverTimestamp(),
  });
}



export async function criarConsulta(
  consulta: Consulta
): Promise<void> {
  try {
    await addDoc(collection(db, 'consultas'), {
      userId: consulta.userId,

      // Identificação da consulta pessoal
      pacienteId: consulta.userId,
      medicoId: null,
      criadoPorId: consulta.userId,
      origem: 'pessoal',
      status: 'registro_pessoal',

      // Campos que já utilizamos
      especialidade: consulta.especialidade.trim(),
      medico: consulta.medico.trim(),
      data: consulta.data.trim(),
      horario: consulta.horario.trim(),
      local: consulta.local.trim(),
      observacao: consulta.observacao?.trim() ?? '',

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
  const usuarioAtual = auth.currentUser;

  if (!usuarioAtual || usuarioAtual.uid !== userId) {
    throw new Error('Usuário não autorizado.');
  }

  const referencia = doc(db, 'consultas', consultaId);
  const resultado = await getDoc(referencia);

  // 1. Verificar se a consulta existe
  if (!resultado.exists()) {
    throw new Error('Consulta não encontrada.');
  }

  const consulta = resultado.data();

  // 2. Verificar se pertence ao usuário autenticado
  if (consulta.userId !== userId) {
    throw new Error(
      'Você não tem permissão para editar esta consulta.'
    );
  }

  // 3. Impedir edição de consultas cadastradas pelo médico
  if (consulta.origem === 'medico') {
    throw new Error(
      'Consultas cadastradas pelo médico não podem ser editadas pelo paciente.'
    );
  }

  // 4. Atualizar os dados
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
    const usuarioAtual = auth.currentUser;

    if (!usuarioAtual || usuarioAtual.uid !== userId) {
      throw new Error('Usuário não autorizado.');
    }

    const referencia = doc(db, 'consultas', consultaId);
    const resultado = await getDoc(referencia);

    if (!resultado.exists()) {
      throw new Error('Consulta não encontrada.');
    }

    const consulta = resultado.data();

    if (consulta.userId !== userId) {
      throw new Error(
        'Você não tem permissão para excluir esta consulta.'
      );
    }

    if (consulta.origem === 'medico') {
      throw new Error(
        'Consultas cadastradas pelo médico não podem ser excluídas pelo paciente.'
      );
    }

    await deleteDoc(referencia);

    console.log('Consulta excluída com sucesso!');
  } catch (error) {
    console.error('Erro ao excluir consulta:', error);
    throw error;
  }
}



export async function responderConsulta(
  consultaId: string,
  resposta: 'confirmada' | 'recusada'
): Promise<void> {
  const pacienteId = auth.currentUser?.uid;

  if (!pacienteId) {
    throw new Error('Paciente não autenticado.');
  }

  const consultaRef = doc(db, 'consultas', consultaId);

  await runTransaction(db, async (transaction) => {
    const resultado = await transaction.get(consultaRef);

    if (!resultado.exists()) {
      throw new Error('Consulta não encontrada.');
    }

    const consulta = resultado.data();

    if (consulta.pacienteId !== pacienteId) {
      throw new Error(
        'Você não tem permissão para responder esta consulta.'
      );
    }

    if (consulta.origem !== 'medico') {
      throw new Error(
        'Esta consulta não foi cadastrada por um médico.'
      );
    }

    if (consulta.status !== 'aguardando_confirmacao') {
      throw new Error(
        'Esta consulta já foi respondida.'
      );
    }

    transaction.update(consultaRef, {
      status: resposta,
      respondidoEm: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}


export function acompanharConsultasPaciente(
  pacienteId: string,
  callback: (consultas: Consulta[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const consultaQuery = query(
    collection(db, 'consultas'),
    where('userId', '==', pacienteId)
  );

  return onSnapshot(
    consultaQuery,
    (resultado) => {
      const consultas: Consulta[] = resultado.docs.map(
        (documento) => ({
          id: documento.id,
          ...(documento.data() as Omit<Consulta, 'id'>),
        })
      );

      callback(consultas);
    },
    (error) => {
      console.error('Erro ao acompanhar consultas:', error);
      onError?.(error);
    }
  );
}
