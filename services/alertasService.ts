
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';

import { db } from '../firebaseConfig';

import {
  listarPacientesVinculados,
  type PacienteVinculado,
} from './pacientesVinculadosService';

import {
  listarGlicemias,
  type Glicemia,
} from './glicemiaService';

export type TipoAlerta = 'glicemia' | 'pressao';

export type GravidadeAlerta =
  | 'critico'
  | 'alto'
  | 'atencao';

export interface AlertaMedico {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  tipo: TipoAlerta;
  gravidade: GravidadeAlerta;
  titulo: string;
  descricao: string;
  valor: string;
  dataMedicao: number;
  contexto?: string;
}

interface RegistroPressao {
  id: string;
  sistolica: number;
  diastolica: number;
  dataMedicao: Timestamp | null;
}

const PERIODO_ALERTAS_DIAS = 30;

const PERIODO_ALERTAS_MS =
  PERIODO_ALERTAS_DIAS * 24 * 60 * 60 * 1000;

const PRIORIDADE: Record<GravidadeAlerta, number> = {
  critico: 3,
  alto: 2,
  atencao: 1,
};

function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function dataGlicemia(
  registro: Glicemia
): number {
  const partes = registro.data.split(/[/-]/);

  if (partes.length !== 3) {
    return 0;
  }

  let ano: number;
  let mes: number;
  let dia: number;

  if (partes[0].length === 4) {
    ano = Number(partes[0]);
    mes = Number(partes[1]);
    dia = Number(partes[2]);
  } else {
    dia = Number(partes[0]);
    mes = Number(partes[1]);
    ano = Number(partes[2]);
  }

  const partesHorario = registro.horario.split(':');

  const hora = Number(partesHorario[0]);
  const minuto = Number(partesHorario[1]);

  if (
    !Number.isInteger(ano) ||
    !Number.isInteger(mes) ||
    !Number.isInteger(dia) ||
    !Number.isInteger(hora) ||
    !Number.isInteger(minuto) ||
    hora < 0 ||
    hora > 23 ||
    minuto < 0 ||
    minuto > 59
  ) {
    return 0;
  }

  const data = new Date(
    ano,
    mes - 1,
    dia,
    hora,
    minuto
  );

  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    return 0;
  }

  return data.getTime();
}

function medicaoRecente(
  data: number,
  agora: number
): boolean {
  return (
    Number.isFinite(data) &&
    data > 0 &&
    data <= agora &&
    data >= agora - PERIODO_ALERTAS_MS
  );
}

function classificarGlicemia(
  registro: Glicemia
): {
  gravidade: GravidadeAlerta;
  titulo: string;
  descricao: string;
} | null {
  const valor = registro.valor;

  if (!Number.isFinite(valor) || valor <= 0) {
    return null;
  }

  const contexto = normalizarTexto(
    registro.contexto || ''
  );

  if (valor < 54) {
    return {
      gravidade: 'critico',
      titulo: 'Glicemia muito baixa',
      descricao:
        'Medição abaixo de 54 mg/dL. Valor que exige atenção imediata.',
    };
  }

  if (valor < 70) {
    return {
      gravidade: 'alto',
      titulo: 'Glicemia baixa',
      descricao:
        'Medição abaixo de 70 mg/dL. Recomenda-se avaliação do registro.',
    };
  }

  if (valor >= 300) {
    return {
      gravidade: 'alto',
      titulo: 'Glicemia muito elevada',
      descricao:
        'Medição de glicemia muito elevada. Recomenda-se avaliação clínica.',
    };
  }

  if (valor >= 250) {
    return {
      gravidade: 'atencao',
      titulo: 'Glicemia elevada',
      descricao:
        'Medição elevada de glicemia. O contexto clínico deve ser avaliado.',
    };
  }

  const emJejum =
    contexto.includes('jejum') ||
    contexto.includes('antes do cafe');

  const aposRefeicao =
    contexto.includes('apos') ||
    contexto.includes('depois') ||
    contexto.includes('pos-prandial') ||
    contexto.includes('pos prandial');

  if (emJejum && valor > 130) {
    return {
      gravidade: 'atencao',
      titulo: 'Glicemia em jejum elevada',
      descricao:
        'Medição acima da meta de referência para jejum em muitos adultos com diabetes.',
    };
  }

  if (aposRefeicao && valor >= 180) {
    return {
      gravidade: 'atencao',
      titulo: 'Glicemia após refeição elevada',
      descricao:
        'Medição acima da meta pós-prandial de referência para muitos adultos com diabetes.',
    };
  }

  return null;
}

function classificarPressao(
  sistolica: number,
  diastolica: number
): {
  gravidade: GravidadeAlerta;
  titulo: string;
  descricao: string;
} | null {
  if (
    !Number.isFinite(sistolica) ||
    !Number.isFinite(diastolica) ||
    sistolica <= 0 ||
    diastolica <= 0
  ) {
    return null;
  }

  if (
    sistolica > 180 ||
    diastolica > 120
  ) {
    return {
      gravidade: 'critico',
      titulo: 'Pressão arterial muito elevada',
      descricao:
        'Valor na faixa de hipertensão grave. Requer reavaliação imediata e atenção a sintomas de emergência.',
    };
  }

  if (
    sistolica >= 160 ||
    diastolica >= 100
  ) {
    return {
      gravidade: 'alto',
      titulo: 'Pressão arterial elevada',
      descricao:
        'Medição muito acima dos valores de referência. Recomenda-se avaliação clínica.',
    };
  }

  if (
    sistolica >= 140 ||
    diastolica >= 90
  ) {
    return {
      gravidade: 'atencao',
      titulo: 'Pressão acima da referência',
      descricao:
        'Medição em faixa elevada de pressão arterial. A avaliação depende de medições repetidas e do contexto clínico.',
    };
  }

  if (
    sistolica < 90 &&
    diastolica < 60
  ) {
    return {
      gravidade: 'atencao',
      titulo: 'Pressão arterial baixa',
      descricao:
        'Medição abaixo de 90/60 mmHg. Avaliar especialmente a presença de sintomas.',
    };
  }

  return null;
}

async function buscarUltimaPressao(
  pacienteId: string
): Promise<RegistroPressao | null> {
  const referencia = collection(
    db,
    'usuarios',
    pacienteId,
    'registrosPressao'
  );

  const consulta = query(
    referencia,
    orderBy('dataMedicao', 'desc')
  );

  const resultado = await getDocs(consulta);

  for (const documento of resultado.docs) {
    const dados = documento.data();

    const sistolica = Number(dados.sistolica);
    const diastolica = Number(dados.diastolica);

    const dataMedicao =
      dados.dataMedicao instanceof Timestamp
        ? dados.dataMedicao
        : null;

    if (
      Number.isFinite(sistolica) &&
      Number.isFinite(diastolica) &&
      sistolica > 0 &&
      diastolica > 0 &&
      dataMedicao
    ) {
      return {
        id: documento.id,
        sistolica,
        diastolica,
        dataMedicao,
      };
    }
  }

  return null;
}

async function alertaGlicemiaPaciente(
  paciente: PacienteVinculado,
  agora: number
): Promise<AlertaMedico | null> {
  const registros = await listarGlicemias(
    paciente.id
  );

  const validos = registros
    .filter(
      (registro) =>
        Number.isFinite(registro.valor) &&
        registro.valor > 0 &&
        dataGlicemia(registro) > 0
    )
    .sort(
      (a, b) =>
        dataGlicemia(b) - dataGlicemia(a)
    );

  const ultimo = validos[0];

  if (!ultimo) {
    return null;
  }

  const data = dataGlicemia(ultimo);

  if (!medicaoRecente(data, agora)) {
    return null;
  }

  const classificacao =
    classificarGlicemia(ultimo);

  if (!classificacao) {
    return null;
  }

  return {
    id: `glicemia-${paciente.id}-${ultimo.id ?? data}`,
    pacienteId: paciente.id,
    pacienteNome: paciente.nome,
    tipo: 'glicemia',
    gravidade: classificacao.gravidade,
    titulo: classificacao.titulo,
    descricao: classificacao.descricao,
    valor: `${ultimo.valor} mg/dL`,
    dataMedicao: data,
    contexto: ultimo.contexto,
  };
}

async function alertaPressaoPaciente(
  paciente: PacienteVinculado,
  agora: number
): Promise<AlertaMedico | null> {
  const ultimo = await buscarUltimaPressao(
    paciente.id
  );

  if (!ultimo || !ultimo.dataMedicao) {
    return null;
  }

  const data = ultimo.dataMedicao.toMillis();

  if (!medicaoRecente(data, agora)) {
    return null;
  }

  const classificacao = classificarPressao(
    ultimo.sistolica,
    ultimo.diastolica
  );

  if (!classificacao) {
    return null;
  }

  return {
    id: `pressao-${paciente.id}-${ultimo.id}`,
    pacienteId: paciente.id,
    pacienteNome: paciente.nome,
    tipo: 'pressao',
    gravidade: classificacao.gravidade,
    titulo: classificacao.titulo,
    descricao: classificacao.descricao,
    valor: `${ultimo.sistolica}/${ultimo.diastolica} mmHg`,
    dataMedicao: data,
  };
}

export async function listarAlertasMedico():
  Promise<AlertaMedico[]> {
  const pacientes =
    await listarPacientesVinculados();

  if (pacientes.length === 0) {
    return [];
  }

  const agora = Date.now();

  const resultados = await Promise.all(
    pacientes.flatMap((paciente) => [
      alertaGlicemiaPaciente(paciente, agora),
      alertaPressaoPaciente(paciente, agora),
    ])
  );

  return resultados
    .filter(
      (alerta): alerta is AlertaMedico =>
        alerta !== null
    )
    .sort((a, b) => {
      const diferencaGravidade =
        PRIORIDADE[b.gravidade] -
        PRIORIDADE[a.gravidade];

      if (diferencaGravidade !== 0) {
        return diferencaGravidade;
      }

      return b.dataMedicao - a.dataMedicao;
    });
}
