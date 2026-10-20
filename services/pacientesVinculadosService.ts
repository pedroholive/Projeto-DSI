
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

import { auth, db } from '../firebaseConfig';

export interface PacienteVinculado {
  id: string;
  nome: string;
}

export async function listarPacientesVinculados():
  Promise<PacienteVinculado[]> {
  const profissionalId = auth.currentUser?.uid;

  if (!profissionalId) {
    throw new Error('Usuário não autenticado.');
  }

  const consulta = query(
    collection(db, 'vinculos'),
    where('profissionalId', '==', profissionalId),
    where('status', '==', 'ativo')
  );

  const resultado = await getDocs(consulta);

  return resultado.docs.map((documento) => {
    const dados = documento.data();

    return {
      id: dados.pacienteId as string,
      nome:
        typeof dados.nomePaciente === 'string' &&
        dados.nomePaciente.trim()
          ? dados.nomePaciente
          : 'Paciente vinculado',
    };
  });
}
