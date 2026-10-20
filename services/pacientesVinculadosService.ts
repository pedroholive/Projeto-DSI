
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebaseConfig";

export interface PacienteVinculado {
  id: string;
  nome: string;
}

interface RespostaPacientesVinculados {
  pacientes: PacienteVinculado[];
}

export async function listarPacientesVinculados(): Promise<PacienteVinculado[]> {
  const chamada = httpsCallable<
    void,
    RespostaPacientesVinculados
  >(functions, "listarPacientesVinculados");

  const resultado = await chamada();

  return resultado.data.pacientes;
}
