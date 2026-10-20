
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '@/firebaseConfig';

export type StatusVinculo =
  | 'pendente'
  | 'ativo'
  | 'recusado'
  | 'revogado';

export interface Vinculo {
  id?: string;
  profissionalId: string;
  pacienteId: string;
  status: StatusVinculo;
}

// Inicialmente, somente médicos.
// Futuramente, podemos incluir outras profissões.
const PROFISSOES_PERMITIDAS = ['Médico'];

function gerarIdVinculo(
  profissionalId: string,
  pacienteId: string
): string {
  return `${profissionalId}_${pacienteId}`;
}

// Solicitar vínculo com paciente
export async function solicitarVinculo(
  pacienteId: string
): Promise<void> {
  const profissionalId = auth.currentUser?.uid;

  if (!profissionalId) {
    throw new Error('Usuário não autenticado.');
  }

  if (!pacienteId || pacienteId === profissionalId) {
    throw new Error('Paciente inválido.');
  }

  const profissionalRef = doc(
    db,
    'usuarios',
    profissionalId
  );

  const pacienteRef = doc(
    db,
    'usuarios',
    pacienteId
  );

  const [profissionalDoc, pacienteDoc] =
    await Promise.all([
      getDoc(profissionalRef),
      getDoc(pacienteRef),
    ]);

  if (!profissionalDoc.exists()) {
    throw new Error('Profissional não encontrado.');
  }

  const profissional = profissionalDoc.data();

  if (
    profissional.perfil !== 'professional' ||
    !PROFISSOES_PERMITIDAS.includes(
      profissional.especialidade
    ) ||
    profissional.verificado !== true
  ) {
    throw new Error(
      'Profissional não autorizado a solicitar vínculos.'
    );
  }

  if (
    !pacienteDoc.exists() ||
    pacienteDoc.data().perfil !== 'patient'
  ) {
    throw new Error('Paciente não encontrado.');
  }

  const vinculoId = gerarIdVinculo(
    profissionalId,
    pacienteId
  );

  const vinculoRef = doc(
    db,
    'vinculos',
    vinculoId
  );

  await runTransaction(db, async (transaction) => {
    const vinculoDoc = await transaction.get(
      vinculoRef
    );

    if (vinculoDoc.exists()) {
      throw new Error(
        'Já existe uma solicitação ou vínculo entre estes usuários.'
      );
    }

    transaction.set(vinculoRef, {
      profissionalId,
      pacienteId,
      status: 'pendente',
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });
  });
}

// Paciente aceita ou recusa o vínculo
export async function responderVinculo(
  vinculoId: string,
  aceitar: boolean
): Promise<void> {
  const pacienteId = auth.currentUser?.uid;

  if (!pacienteId) {
    throw new Error('Usuário não autenticado.');
  }

  const vinculoRef = doc(
    db,
    'vinculos',
    vinculoId
  );

  await runTransaction(db, async (transaction) => {
    const resultado = await transaction.get(
      vinculoRef
    );

    if (!resultado.exists()) {
      throw new Error('Solicitação não encontrada.');
    }

    const vinculo = resultado.data();

    if (vinculo.pacienteId !== pacienteId) {
      throw new Error(
        'Você não pode responder esta solicitação.'
      );
    }

    if (vinculo.status !== 'pendente') {
      throw new Error(
        'Esta solicitação já foi respondida.'
      );
    }

    transaction.update(vinculoRef, {
      status: aceitar ? 'ativo' : 'recusado',
      atualizadoEm: serverTimestamp(),
    });
  });
}

// Listar vínculos do paciente autenticado
export async function listarVinculosPaciente():
  Promise<Vinculo[]> {

  const pacienteId = auth.currentUser?.uid;

  if (!pacienteId) {
    throw new Error('Usuário não autenticado.');
  }

  const consulta = query(
    collection(db, 'vinculos'),
    where('pacienteId', '==', pacienteId)
  );

  const resultado = await getDocs(consulta);

  return resultado.docs.map((documento) => ({
    id: documento.id,
    ...(documento.data() as Omit<Vinculo, 'id'>),
  }));
}

// Listar vínculos do profissional autenticado
export async function listarVinculosProfissional():
  Promise<Vinculo[]> {

  const profissionalId = auth.currentUser?.uid;

  if (!profissionalId) {
    throw new Error('Usuário não autenticado.');
  }

  const consulta = query(
    collection(db, 'vinculos'),
    where('profissionalId', '==', profissionalId)
  );

  const resultado = await getDocs(consulta);

  return resultado.docs.map((documento) => ({
    id: documento.id,
    ...(documento.data() as Omit<Vinculo, 'id'>),
  }));
}

// Paciente revoga um vínculo ativo
export async function revogarVinculo(
  vinculoId: string
): Promise<void> {
  const pacienteId = auth.currentUser?.uid;

  if (!pacienteId) {
    throw new Error('Usuário não autenticado.');
  }

  const vinculoRef = doc(
    db,
    'vinculos',
    vinculoId
  );

  await runTransaction(db, async (transaction) => {
    const resultado = await transaction.get(
      vinculoRef
    );

    if (!resultado.exists()) {
      throw new Error('Vínculo não encontrado.');
    }

    const vinculo = resultado.data();

    if (vinculo.pacienteId !== pacienteId) {
      throw new Error(
        'Você não pode revogar este vínculo.'
      );
    }

    if (vinculo.status !== 'ativo') {
      throw new Error(
        'Somente vínculos ativos podem ser revogados.'
      );
    }

    transaction.update(vinculoRef, {
      status: 'revogado',
      atualizadoEm: serverTimestamp(),
    });
  });
}


export async function solicitarVinculoPorCodigo(
  codigo: string
): Promise<string> {
  const solicitar = httpsCallable<
    { codigo: string },
    { sucesso: boolean; vinculoId: string }
  >(functions, "solicitarVinculoPorCodigo");

  const resultado = await solicitar({
    codigo: codigo.trim().toUpperCase(),
  });

  return resultado.data.vinculoId;
}

export interface CodigoVinculoGerado {
  codigo: string;
  expiraEm: number;
}

export async function gerarCodigoVinculo(): Promise<CodigoVinculoGerado> {
  const gerarCodigo = httpsCallable<
    Record<string, never>,
    CodigoVinculoGerado
  >(functions, "gerarCodigoVinculo");

  const resultado = await gerarCodigo({});

  return resultado.data;
}