
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  AlertaMedico,
} from './alertasService';

const PREFIXO = '@healthsync:alertas-visualizados:';

function chaveArmazenamento(medicoId: string): string {
  return `${PREFIXO}${medicoId}`;
}

function identificadorAlerta(
  alerta: AlertaMedico
): string {
  return JSON.stringify({
    id: alerta.id,
    pacienteId: alerta.pacienteId,
    tipo: alerta.tipo,
    valor: alerta.valor,
    gravidade: alerta.gravidade,
    dataMedicao: alerta.dataMedicao,
  });
}

async function lerVisualizados(
  medicoId: string
): Promise<string[]> {
  if (!medicoId.trim()) {
    throw new Error('Médico não identificado.');
  }

  const armazenados = await AsyncStorage.getItem(
    chaveArmazenamento(medicoId)
  );

  if (!armazenados) {
    return [];
  }

  const dados: unknown = JSON.parse(armazenados);

  if (
    !Array.isArray(dados) ||
    !dados.every(
      (item) => typeof item === 'string'
    )
  ) {
    throw new Error(
      'Os dados de visualização dos alertas são inválidos.'
    );
  }

  return dados;
}

export async function contarAlertasNaoVisualizados(
  medicoId: string,
  alertas: AlertaMedico[]
): Promise<number> {
  const visualizados = new Set(
    await lerVisualizados(medicoId)
  );

  return alertas.filter(
    (alerta) =>
      !visualizados.has(
        identificadorAlerta(alerta)
      )
  ).length;
}

export async function marcarAlertasComoVisualizados(
  medicoId: string,
  alertas: AlertaMedico[]
): Promise<void> {
  if (alertas.length === 0) {
    return;
  }

  const anteriores = await lerVisualizados(medicoId);

  const visualizados = new Set(anteriores);

  for (const alerta of alertas) {
    visualizados.add(
      identificadorAlerta(alerta)
    );
  }

  await AsyncStorage.setItem(
    chaveArmazenamento(medicoId),
    JSON.stringify([...visualizados])
  );
}
