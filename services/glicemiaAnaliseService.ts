import type { Glicemia } from './glicemiaService';

export type PeriodoGlicemia = 7 | 15 | 30 | 'todos';

export interface AnaliseGlicemia {
  quantidade: number;
  media: number | null;
  menorValor: number | null;
  maiorValor: number | null;
  tendencia: 'aumento' | 'queda' | 'estavel' | 'insuficiente';
  feedback: string;
}

function converterData(data: string): Date | null {
  const partes = data.split('/').map(Number);

  if (partes.length !== 3) return null;

  const [dia, mes, ano] = partes;

  const resultado = new Date(ano, mes - 1, dia);

  if (
    resultado.getFullYear() !== ano ||
    resultado.getMonth() !== mes - 1 ||
    resultado.getDate() !== dia
  ) {
    return null;
  }

  return resultado;
}

export function filtrarGlicemias(
  registros: Glicemia[],
  periodo: PeriodoGlicemia,
  contexto: string
): Glicemia[] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return registros
    .filter((registro) => {
      const data = converterData(registro.data);

      if (!data) return false;

      if (contexto !== 'Todos' && registro.contexto !== contexto) {
        return false;
      }

      if (periodo !== 'todos') {
        const inicio = new Date(hoje);
        inicio.setDate(inicio.getDate() - (periodo - 1));

        if (data < inicio || data > hoje) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const dataA = converterData(a.data)!.getTime();
      const dataB = converterData(b.data)!.getTime();

      if (dataA !== dataB) return dataA - dataB;

      return a.horario.localeCompare(b.horario);
    });
}

export function analisarGlicemias(
  registros: Glicemia[]
): AnaliseGlicemia {
  const valores = registros
    .map((registro) => Number(registro.valor))
    .filter((valor) => Number.isFinite(valor) && valor > 0);

  const quantidade = valores.length;

  if (quantidade === 0) {
    return {
      quantidade: 0,
      media: null,
      menorValor: null,
      maiorValor: null,
      tendencia: 'insuficiente',
      feedback: 'Ainda não existem medições para os filtros selecionados.',
    };
  }

  const soma = valores.reduce((total, valor) => total + valor, 0);
  const media = soma / quantidade;

  const menorValor = Math.min(...valores);
  const maiorValor = Math.max(...valores);

  if (quantidade < 2) {
    return {
      quantidade,
      media,
      menorValor,
      maiorValor,
      tendencia: 'insuficiente',
      feedback:
        'Registre mais medições para visualizar uma tendência dos seus valores de glicemia.',
    };
  }

  // Compara a média da primeira metade com a da segunda metade.
  const metade = Math.floor(quantidade / 2);

  const primeiraMetade = valores.slice(0, metade);
  const segundaMetade = valores.slice(metade);

  const mediaPrimeira =
    primeiraMetade.reduce((a, b) => a + b, 0) / primeiraMetade.length;

  const mediaSegunda =
    segundaMetade.reduce((a, b) => a + b, 0) / segundaMetade.length;

  const diferencaPercentual =
    ((mediaSegunda - mediaPrimeira) / mediaPrimeira) * 100;

  let tendencia: AnaliseGlicemia['tendencia'];
  let feedback: string;

  if (diferencaPercentual > 5) {
    tendencia = 'aumento';
    feedback =
      'As medições apresentam uma tendência de aumento no período selecionado.';
  } else if (diferencaPercentual < -5) {
    tendencia = 'queda';
    feedback =
      'As medições apresentam uma tendência de queda no período selecionado.';
  } else {
    tendencia = 'estavel';
    feedback =
      'As medições apresentam pouca variação entre as médias das duas partes do período.';
  }

  feedback +=
    ' Essa análise é apenas informativa. Os valores devem ser interpretados considerando o horário, o contexto da medição e as orientações do profissional de saúde.';

  return {
    quantidade,
    media,
    menorValor,
    maiorValor,
    tendencia,
    feedback,
  };
}