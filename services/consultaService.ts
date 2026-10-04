import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
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