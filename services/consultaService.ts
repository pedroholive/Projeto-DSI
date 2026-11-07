
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { db, auth } from '@/firebaseConfig';
import { geocodificarEndereco } from '@/services/geocodificacaoservice';

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
  latitude?: number;
  longitude?: number;
}

type Coordenadas = {
  latitude: number;
  longitude: number;
};

function coordenadasValidas(
  latitude: number,
  longitude: number
): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

function obterCoordenadasInformadas(
  latitude: number | undefined,
  longitude: number | undefined
): Coordenadas | null {
  if (
    latitude === undefined &&
    longitude === undefined
  ) {
    return null;
  }

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !coordenadasValidas(latitude, longitude)
  ) {
    throw new Error(
      'As coordenadas da localização são inválidas.'
    );
  }

  return {
    latitude,
    longitude,
  };
}

async function coordenadasDoLocal(
  local: string
): Promise<Coordenadas | null> {
  const coordenadas = await geocodificarEndereco(local);

  if (
    !coordenadas ||
    !coordenadasValidas(
      coordenadas.latitude,
      coordenadas.longitude
    )
  ) {
    return null;
  }

  return {
    latitude: coordenadas.latitude,
    longitude: coordenadas.longitude,
  };
}

async function resolverCoordenadas(
  local: string,
  latitude?: number,
  longitude?: number
): Promise<Coordenadas | null> {
  const informadas = obterCoordenadasInformadas(
    latitude,
    longitude
  );

  if (informadas) {
    return informadas;
  }

  return coordenadasDoLocal(local);
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

  const coordenadasInformadas =
    obterCoordenadasInformadas(
      dados.latitude,
      dados.longitude
    );

  const vinculoQuery = query(
    collection(db, 'vinculos'),
    where('profissionalId', '==', medicoId),
    where('pacienteId', '==', dados.pacienteId),
    where('status', '==', 'ativo')
  );

  const vinculoSnapshot = await getDocs(vinculoQuery);

  if (vinculoSnapshot.empty) {
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
    medicoSnapshot.data().nome ??
    'Médico responsável';

  const coordenadas =
    coordenadasInformadas ??
    (await coordenadasDoLocal(dados.local.trim()));

  await addDoc(collection(db, 'consultas'), {
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
    ...(coordenadas ?? {}),
    createdAt: serverTimestamp(),
  });
}

export async function criarConsulta(
  consulta: Consulta
): Promise<void> {
  try {
    const coordenadas = await resolverCoordenadas(
      consulta.local.trim(),
      consulta.latitude,
      consulta.longitude
    );

    await addDoc(collection(db, 'consultas'), {
      userId: consulta.userId,
      pacienteId: consulta.userId,
      medicoId: null,
      criadoPorId: consulta.userId,
      origem: 'pessoal',
      status: 'registro_pessoal',
      especialidade: consulta.especialidade.trim(),
      medico: consulta.medico.trim(),
      data: consulta.data.trim(),
      horario: consulta.horario.trim(),
      local: consulta.local.trim(),
      observacao: consulta.observacao?.trim() ?? '',
      ...(coordenadas ?? {}),
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

    const consultas: Consulta[] = resultado.docs.map(
      (documento) => ({
        id: documento.id,
        ...(documento.data() as Omit<Consulta, 'id'>),
      })
    );

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
  > & {
    latitude?: number;
    longitude?: number;
  }
): Promise<void> {
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
      'Você não tem permissão para editar esta consulta.'
    );
  }

  if (consulta.origem === 'medico') {
    throw new Error(
      'Consultas cadastradas pelo médico não podem ser editadas pelo paciente.'
    );
  }

  const localNovo = dadosAtualizados.local.trim();

  const mudouLocal =
    localNovo !== String(consulta.local ?? '').trim();

  const coordenadasInformadas =
    obterCoordenadasInformadas(
      dadosAtualizados.latitude,
      dadosAtualizados.longitude
    );

  let coordenadas: Coordenadas | null =
    coordenadasInformadas;

  if (!coordenadas) {
    const latitudeAnterior = consulta.latitude;
    const longitudeAnterior = consulta.longitude;

    const coordenadasAnterioresValidas =
      typeof latitudeAnterior === 'number' &&
      typeof longitudeAnterior === 'number' &&
      coordenadasValidas(
        latitudeAnterior,
        longitudeAnterior
      );

    if (!mudouLocal && coordenadasAnterioresValidas) {
      coordenadas = {
        latitude: latitudeAnterior,
        longitude: longitudeAnterior,
      };
    } else {
      coordenadas = await coordenadasDoLocal(localNovo);
    }
  }

  await updateDoc(referencia, {
    especialidade:
      dadosAtualizados.especialidade.trim(),
    medico: dadosAtualizados.medico.trim(),
    data: dadosAtualizados.data.trim(),
    horario: dadosAtualizados.horario.trim(),
    local: localNovo,
    observacao:
      dadosAtualizados.observacao?.trim() ?? '',
    latitude: coordenadas?.latitude ?? deleteField(),
    longitude: coordenadas?.longitude ?? deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function excluirConsulta(
  consultaId: string,
  userId: string
): Promise<void> {
  try {
    const usuarioAtual = auth.currentUser;

    if (
      !usuarioAtual ||
      usuarioAtual.uid !== userId
    ) {
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

    if (
      consulta.status !== 'aguardando_confirmacao'
    ) {
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
      console.error(
        'Erro ao acompanhar consultas:',
        error
      );

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

  const consultaQuery = query(
    collection(db, 'consultas'),
    where('medicoId', '==', medicoId),
    where('origem', '==', 'medico')
  );

  let nomes: Map<string, string> | null = null;

  async function carregarNomes(): Promise<
    Map<string, string>
  > {
    if (nomes) {
      return nomes;
    }

    const mapa = new Map<string, string>();

    try {
      const snap = await getDocs(
        query(
          collection(db, 'vinculos'),
          where('profissionalId', '==', medicoId)
        )
      );

      snap.docs.forEach((documento) => {
        const vinculo = documento.data();

        if (
          typeof vinculo.nomePaciente === 'string' &&
          vinculo.nomePaciente.trim()
        ) {
          mapa.set(
            vinculo.pacienteId as string,
            vinculo.nomePaciente
          );
        }
      });

      nomes = mapa;
    } catch (error) {
      console.error(
        'Erro ao carregar nomes dos pacientes:',
        error
      );
    }

    return mapa;
  }

  return onSnapshot(
    consultaQuery,
    async (resultado) => {
      const mapa = await carregarNomes();

      const consultas: ConsultaMedico[] =
        resultado.docs.map((documento) => {
          const dados = documento.data() as Omit<
            Consulta,
            'id'
          >;

          return {
            id: documento.id,
            ...dados,
            pacienteNome: dados.pacienteId
              ? mapa.get(dados.pacienteId)
              : undefined,
          };
        });

      callback(consultas);
    },
    (error) => {
      console.error(
        'Erro ao acompanhar consultas do médico:',
        error
      );

      onError?.(error);
    }
  );
}

export async function cancelarConsultaMedico(
  consultaId: string
): Promise<void> {
  await updateDoc(
    doc(db, 'consultas', consultaId),
    {
      status: 'cancelada',
      updatedAt: serverTimestamp(),
    }
  );
}

export async function reagendarConsultaMedico(
  consultaId: string,
  data: string,
  horario: string
): Promise<void> {
  await updateDoc(
    doc(db, 'consultas', consultaId),
    {
      data,
      horario,
      status: 'aguardando_confirmacao',
      updatedAt: serverTimestamp(),
    }
  );
}

export async function excluirConsultaMedico(
  consultaId: string
): Promise<void> {
  await deleteDoc(
    doc(db, 'consultas', consultaId)
  );
}
