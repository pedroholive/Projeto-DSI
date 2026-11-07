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
  deleteField,
  runTransaction,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, auth} from '@/firebaseConfig';
import { geocodificarEndereco } from '@/services/geocodificacaoservice';


export type StatusConsulta =
  | 'registro_pessoal'
  | 'aguardando_confirmacao'
  | 'confirmada'
  | 'recusada'
  | 'cancelada';

export type OrigemConsulta = 'pessoal' | 'medico';

// Converte o endereço em coordenadas. Se não achar, devolve {} e a consulta
// é salva normalmente, sem mapa.
async function coordenadasDoLocal(
  local: string
): Promise<{ latitude?: number; longitude?: number }> {
  const coordenadas = await geocodificarEndereco(local);
  return coordenadas
    ? { latitude: coordenadas.latitude, longitude: coordenadas.longitude }
    : {};
}

export interface Consulta {
  id?: string;
  userId: string;

  especialidade: string;
  medico: string;
  data: string;
  horario: string;
  local: string;
  observacao?: string;
  latitude?: number;
  longitude?: number;

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
  const vinculoQuery = query(
  collection(db, 'vinculos'),
  where('profissionalId', '==', medicoId),
  where('pacienteId', '==', dados.pacienteId),
  where('status', '==', 'ativo')
);

  const vinculoSnapshot = await getDocs(vinculoQuery);

  if (vinculoSnapshot.empty) {
    throw new Error('O paciente não possui vínculo ativo com este profissional.');
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

  const coordenadas = await coordenadasDoLocal(dados.local);

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
    ...coordenadas,

    createdAt: serverTimestamp(),
  });
}



export async function criarConsulta(
  consulta: Consulta
): Promise<void> {
  try {
    const coordenadas = await coordenadasDoLocal(consulta.local);

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
      ...coordenadas,

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

  // 4. Coordenadas: só busca de novo se o local mudou ou se ainda não havia
  const localNovo = dadosAtualizados.local.trim();
  const mudouLocal = localNovo !== String(consulta.local ?? '').trim();
  const jaTinhaCoordenadas =
    typeof consulta.latitude === 'number' &&
    typeof consulta.longitude === 'number';

  let coordenadas: { latitude?: number; longitude?: number } = {};

  if (mudouLocal || !jaTinhaCoordenadas) {
    coordenadas = await coordenadasDoLocal(localNovo);
  } else {
    coordenadas = {
      latitude: consulta.latitude as number,
      longitude: consulta.longitude as number,
    };
  }

  // 5. Atualizar os dados
  await updateDoc(referencia, {
    especialidade: dadosAtualizados.especialidade.trim(),
    medico: dadosAtualizados.medico.trim(),
    data: dadosAtualizados.data.trim(),
    horario: dadosAtualizados.horario.trim(),
    local: dadosAtualizados.local.trim(),
    observacao: dadosAtualizados.observacao?.trim() ?? '',
    // Se o novo endereço não foi encontrado, as coordenadas antigas são apagadas
    latitude: coordenadas.latitude ?? deleteField(),
    longitude: coordenadas.longitude ?? deleteField(),
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


export interface ConsultaMedico extends Consulta {
  pacienteNome?: string;
}

export function acompanharConsultasMedico(
  callback: (consultas: ConsultaMedico[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const medicoId = auth.currentUser?.uid;

  if (!medicoId) {
    onError?.(new Error('Médico não autenticado.'));
    return () => {};
  }

  // As regras do Firestore só liberam a leitura quando a consulta é
  // origem 'medico' E medicoId é o do usuário; os dois filtros são necessários.
  const consultaQuery = query(
    collection(db, 'consultas'),
    where('medicoId', '==', medicoId),
    where('origem', '==', 'medico')
  );

  // Nome do paciente: vem do vínculo (campo nomePaciente), pois as regras
  // não permitem ao médico ler o documento do paciente em 'usuarios'.
  let nomes: Map<string, string> | null = null;

  async function carregarNomes(): Promise<Map<string, string>> {
    if (nomes) return nomes;

    const mapa = new Map<string, string>();

    try {
      const snap = await getDocs(
        query(
          collection(db, 'vinculos'),
          where('profissionalId', '==', medicoId)
        )
      );

      snap.docs.forEach((d) => {
        const v = d.data();
        if (typeof v.nomePaciente === 'string' && v.nomePaciente.trim()) {
          mapa.set(v.pacienteId as string, v.nomePaciente);
        }
      });

      nomes = mapa;
    } catch (error) {
      console.error('Erro ao carregar nomes dos pacientes:', error);
    }

    return mapa;
  }

  return onSnapshot(
    consultaQuery,
    async (resultado) => {
      const mapa = await carregarNomes();

      const consultas: ConsultaMedico[] = resultado.docs.map((d) => {
        const dados = d.data() as Omit<Consulta, 'id'>;

        return {
          id: d.id,
          ...dados,
          pacienteNome: dados.pacienteId
            ? mapa.get(dados.pacienteId)
            : undefined,
        };
      });

      callback(consultas);
    },
    (error) => {
      console.error('Erro ao acompanhar consultas do médico:', error);
      onError?.(error);
    }
  );
}

// ===== ACRESCENTAR AO FINAL DE services/consultaService.ts =====
// Confira se o import do firebase/firestore já tem: doc, updateDoc, deleteDoc, serverTimestamp.
// Se faltar algum, acrescente à lista de imports existente.

// Médico cancela a consulta que ele criou
export async function cancelarConsultaMedico(consultaId: string): Promise<void> {
  await updateDoc(doc(db, 'consultas', consultaId), {
    status: 'cancelada',
    updatedAt: serverTimestamp(),
  });
}

// Médico muda data/horário; o paciente precisa confirmar de novo
export async function reagendarConsultaMedico(
  consultaId: string,
  data: string,
  horario: string
): Promise<void> {
  await updateDoc(doc(db, 'consultas', consultaId), {
    data,
    horario,
    status: 'aguardando_confirmacao',
    updatedAt: serverTimestamp(),
  });
}

// Médico exclui a consulta que ele criou
export async function excluirConsultaMedico(consultaId: string): Promise<void> {
  await deleteDoc(doc(db, 'consultas', consultaId));
}