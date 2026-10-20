
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
  Timestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { auth, db } from '../firebaseConfig';

import {
  gerarTokenSeguro,
  tokenTemFormatoValido,
} from './conviteVinculoService';

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
  nomePaciente?: string;
}

export interface CodigoVinculoGerado {
  codigo: string;
  expiraEm: number;
}

const DURACAO_CONVITE_MS = 10 * 60 * 1000;

function usuarioAutenticado(): string {
  const uid = auth.currentUser?.uid;

  if (!uid) {
    throw new Error('Usuário não autenticado.');
  }

  return uid;
}

async function obterNomePaciente(
  pacienteId: string
): Promise<string> {
  const perfil = await getDoc(
    doc(db, 'usuarios', pacienteId)
  );

  if (
    !perfil.exists() ||
    perfil.data().perfil !== 'patient'
  ) {
    throw new Error(
      'Perfil de paciente não encontrado.'
    );
  }

  const nome = perfil.data().nome;

  if (
    typeof nome !== 'string' ||
    !nome.trim()
  ) {
    throw new Error(
      'O paciente precisa ter um nome cadastrado.'
    );
  }

  return nome;
}

async function verificarMedico(
  profissionalId: string
): Promise<void> {
  const perfil = await getDoc(
    doc(db, 'usuarios', profissionalId)
  );

  if (!perfil.exists()) {
    throw new Error('Profissional não encontrado.');
  }

  const dados = perfil.data();

  if (
    dados.perfil !== 'professional' ||
    dados.especialidade !== 'Médico' ||
    dados.verificado !== true
  ) {
    throw new Error(
      'Somente médicos verificados podem solicitar vínculos.'
    );
  }
}

// PACIENTE: GERAR CONVITE

export async function gerarCodigoVinculo():
  Promise<CodigoVinculoGerado> {
  const pacienteId = usuarioAutenticado();

  await obterNomePaciente(pacienteId);

  const codigo = await gerarTokenSeguro();
  const criadoEm = Timestamp.now();

  const expiraEm = Timestamp.fromMillis(
    criadoEm.toMillis() + DURACAO_CONVITE_MS
  );

  await setDoc(
    doc(db, 'codigosVinculo', codigo),
    {
      pacienteId,
      status: 'disponivel',
      criadoEm,
      expiraEm,
    }
  );

  return {
    codigo,
    expiraEm: expiraEm.toMillis(),
  };
}

// MÉDICO: SOLICITAR VÍNCULO PELO CÓDIGO

export async function solicitarVinculoPorCodigo(
  codigo: string
): Promise<string> {
  const profissionalId = usuarioAutenticado();

  await verificarMedico(profissionalId);

  const token = codigo.trim().toLowerCase();

  if (!tokenTemFormatoValido(token)) {
    throw new Error('Código de convite inválido.');
  }

  const conviteRef = doc(
    db,
    'codigosVinculo',
    token
  );

  return runTransaction(db, async (transaction) => {
    const conviteSnapshot =
      await transaction.get(conviteRef);

    if (!conviteSnapshot.exists()) {
      throw new Error(
        'Convite não encontrado ou inválido.'
      );
    }

    const convite = conviteSnapshot.data();

    if (convite.status !== 'disponivel') {
      throw new Error(
        'Este convite já foi utilizado.'
      );
    }

    if (
      !(convite.expiraEm instanceof Timestamp) ||
      convite.expiraEm.toMillis() <= Date.now()
    ) {
      throw new Error(
        'Este convite expirou. Solicite outro ao paciente.'
      );
    }

    const pacienteId = convite.pacienteId;

    if (
      typeof pacienteId !== 'string' ||
      pacienteId === profissionalId
    ) {
      throw new Error('Paciente inválido.');
    }

    const vinculoId =
      `${profissionalId}_${pacienteId}`;

    transaction.set(
      doc(db, 'vinculos', vinculoId),
      {
        profissionalId,
        pacienteId,
        status: 'pendente',
        conviteCodigo: token,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      }
    );

    transaction.update(conviteRef, {
      status: 'utilizado',
      utilizadoPor: profissionalId,
      utilizadoEm: serverTimestamp(),
      vinculoId,
    });

    return vinculoId;
  });
}

// SOLICITAÇÃO DIRETA DESATIVADA

export async function solicitarVinculo(
  pacienteId: string
): Promise<void> {
  if (!pacienteId.trim()) {
    throw new Error('Paciente inválido.');
  }

  throw new Error(
    'Utilize um convite temporário para solicitar vínculo.'
  );
}

// PACIENTE: ACEITAR OU RECUSAR

export async function responderVinculo(
  vinculoId: string,
  aceitar: boolean
): Promise<void> {
  const pacienteId = usuarioAutenticado();

  const nomePaciente = aceitar
    ? await obterNomePaciente(pacienteId)
    : null;

  const vinculoRef = doc(
    db,
    'vinculos',
    vinculoId
  );

  await runTransaction(db, async (transaction) => {
    const snapshot =
      await transaction.get(vinculoRef);

    if (!snapshot.exists()) {
      throw new Error(
        'Solicitação não encontrada.'
      );
    }

    const vinculo = snapshot.data();

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
      ...(aceitar ? { nomePaciente } : {}),
    });
  });
}

// PACIENTE: LISTAR VÍNCULOS

export async function listarVinculosPaciente():
  Promise<Vinculo[]> {
  const pacienteId = usuarioAutenticado();

  const consulta = query(
    collection(db, 'vinculos'),
    where('pacienteId', '==', pacienteId)
  );

  const resultado = await getDocs(consulta);

  const vinculos = resultado.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<Vinculo, 'id'>),
  }));

  // Atualiza vínculos ativos criados antes
  // da inclusão do campo nomePaciente.
  const semNome = vinculos.filter(
    (v) =>
      v.status === 'ativo' &&
      !v.nomePaciente
  );

  if (semNome.length > 0) {
    try {
      const nomePaciente =
        await obterNomePaciente(pacienteId);

      await Promise.all(
        semNome.map((v) =>
          updateDoc(
            doc(db, 'vinculos', v.id!),
            { nomePaciente }
          )
        )
      );

      return vinculos.map((v) =>
        v.status === 'ativo'
          ? { ...v, nomePaciente }
          : v
      );
    } catch (erro) {
      console.warn(
        'Não foi possível sincronizar nome dos vínculos:',
        erro
      );
    }
  }

  return vinculos;
}

// MÉDICO: LISTAR VÍNCULOS

export async function listarVinculosProfissional():
  Promise<Vinculo[]> {
  const profissionalId = usuarioAutenticado();

  const consulta = query(
    collection(db, 'vinculos'),
    where('profissionalId', '==', profissionalId)
  );

  const resultado = await getDocs(consulta);

  return resultado.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<Vinculo, 'id'>),
  }));
}

// PACIENTE: REVOGAR VÍNCULO

export async function revogarVinculo(
  vinculoId: string
): Promise<void> {
  const pacienteId = usuarioAutenticado();

  const vinculoRef = doc(
    db,
    'vinculos',
    vinculoId
  );

  await runTransaction(db, async (transaction) => {
    const snapshot =
      await transaction.get(vinculoRef);

    if (!snapshot.exists()) {
      throw new Error(
        'Vínculo não encontrado.'
      );
    }

    const vinculo = snapshot.data();

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
