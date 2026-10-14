
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Pressable,
} from 'react-native';

import Svg, {
  Line,
  Polyline,
  Circle,
  Text as SvgText,
} from 'react-native-svg';

import { useFocusEffect } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';

import { auth } from '@/firebaseConfig';

import {
  criarGlicemia,
  listarGlicemias,
  atualizarGlicemia,
  excluirGlicemia,
} from '@/services/glicemiaService';

import type { Glicemia } from '@/services/glicemiaService';

import {
  analisarGlicemias,
  filtrarGlicemias,
} from '@/services/glicemiaAnaliseService';

import type {
  PeriodoGlicemia,
} from '@/services/glicemiaAnaliseService';

// ========================================
// CORES E CONFIGURAÇÕES
// ========================================

const C = {
  bg: '#F4F8F7',
  white: '#FFFFFF',
  teal: '#3D8B85',
  dark: '#273331',
  gray: '#7E8D89',
  border: '#C8DEDD',
  error: '#C0392B',
};

const contextos = [
  'Em jejum',
  'Antes da refeição',
  'Após a refeição',
  'Antes de dormir',
  'Outro',
];

const periodos = [
  { texto: '7 dias', valor: 7 },
  { texto: '15 dias', valor: 15 },
  { texto: '30 dias', valor: 30 },
  { texto: 'Todos', valor: 'todos' },
] as const;

type Form = {
  valor: string;
  data: string;
  horario: string;
  contexto: string;
  observacao: string;
};

const inicial: Form = {
  valor: '',
  data: '',
  horario: '',
  contexto: '',
  observacao: '',
};

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function formatarData(valor: string): string {
  const numeros = valor.replace(/\D/g, '').slice(0, 8);

  if (numeros.length <= 2) {
    return numeros;
  }

  if (numeros.length <= 4) {
    return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
  }

  return (
    `${numeros.slice(0, 2)}/` +
    `${numeros.slice(2, 4)}/` +
    numeros.slice(4)
  );
}

function formatarHorario(valor: string): string {
  const numeros = valor.replace(/\D/g, '').slice(0, 4);

  if (numeros.length <= 2) {
    return numeros;
  }

  return `${numeros.slice(0, 2)}:${numeros.slice(2)}`;
}

function dataValida(valor: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
    return false;
  }

  const [dia, mes, ano] = valor.split('/').map(Number);

  if (ano < 1900 || mes < 1 || mes > 12 || dia < 1) {
    return false;
  }

  return dia <= new Date(ano, mes, 0).getDate();
}

function horarioValido(valor: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(valor)) {
    return false;
  }

  const [hora, minuto] = valor.split(':').map(Number);

  return (
    hora >= 0 &&
    hora <= 23 &&
    minuto >= 0 &&
    minuto <= 59
  );
}

function timestampRegistro(registro: Glicemia): number {
  const [dia, mes, ano] = registro.data.split('/').map(Number);
  const [hora, minuto] = registro.horario.split(':').map(Number);

  return new Date(
    ano,
    mes - 1,
    dia,
    hora || 0,
    minuto || 0
  ).getTime();
}

function ordenarRegistros(registros: Glicemia[]): Glicemia[] {
  return [...registros].sort(
    (a, b) => timestampRegistro(b) - timestampRegistro(a)
  );
}

function mostrarMensagem(
  titulo: string,
  mensagem: string
) {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensagem}`);
    return;
  }

  Alert.alert(titulo, mensagem);
}

// ========================================
// COMPONENTE DO GRÁFICO SVG
// ========================================

function GraficoGlicemia({
  registros,
}: {
  registros: Glicemia[];
}) {
  // Guarda o ID do registro, em vez do índice.
  // Isso evita mostrar outra medição quando os filtros mudam.
  const [idSelecionado, setIdSelecionado] =
    useState<string | null>(null);

  const largura = Math.max(300, registros.length * 65 + 70);
  const altura = 260;

  const esquerda = 45;
  const direita = 25;
  const topo = 35;
  const baixo = 45;

  const areaLargura = largura - esquerda - direita;
  const areaAltura = altura - topo - baixo;

  const valores = registros.map((r) => Number(r.valor));

  const menor = Math.min(...valores);
  const maior = Math.max(...valores);

  const margem = Math.max(15, (maior - menor) * 0.15);

  const minimoEscala = Math.max(0, menor - margem);
  const maximoEscala = maior + margem;

  const intervalo = Math.max(
    1,
    maximoEscala - minimoEscala
  );

  const pontos = registros.map((registro, indice) => {
    const x =
      registros.length === 1
        ? esquerda + areaLargura / 2
        : esquerda +
          (indice / (registros.length - 1)) * areaLargura;

    const y =
      topo +
      ((maximoEscala - Number(registro.valor)) / intervalo) *
        areaAltura;

    return {
      x,
      y,
      valor: Number(registro.valor),
      registro,
      chave: registro.id ?? `${registro.data}-${registro.horario}-${indice}`,
    };
  });

  const linha = pontos
    .map((ponto) => `${ponto.x},${ponto.y}`)
    .join(' ');

  const marcas = Array.from({ length: 5 }, (_, indice) => {
    const fracao = indice / 4;

    return {
      y: topo + fracao * areaAltura,
      valor: maximoEscala - fracao * intervalo,
    };
  });

  const selecionado = pontos.find(
    (ponto) => ponto.chave === idSelecionado
  )?.registro;

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        style={styles.rolagemGrafico}
      >
        <View
          style={{
            width: largura,
            height: altura,
          }}
        >
          <Svg width={largura} height={altura}>
            {/* Linhas horizontais e escala */}

            {marcas.map((marca, indice) => (
              <React.Fragment key={`marca-${indice}`}>
                <Line
                  x1={esquerda}
                  y1={marca.y}
                  x2={largura - direita}
                  y2={marca.y}
                  stroke="#E5EFED"
                  strokeWidth={1}
                />

                <SvgText
                  x={esquerda - 7}
                  y={marca.y + 4}
                  fill={C.gray}
                  fontSize={10}
                  textAnchor="end"
                >
                  {marca.valor.toFixed(0)}
                </SvgText>
              </React.Fragment>
            ))}

            {/* Eixos */}

            <Line
              x1={esquerda}
              y1={topo}
              x2={esquerda}
              y2={topo + areaAltura}
              stroke={C.border}
              strokeWidth={1}
            />

            <Line
              x1={esquerda}
              y1={topo + areaAltura}
              x2={largura - direita}
              y2={topo + areaAltura}
              stroke={C.border}
              strokeWidth={1}
            />

            {/* Linha das medições */}

            {pontos.length > 1 && (
              <Polyline
                points={linha}
                fill="none"
                stroke={C.teal}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

            {/* Pontos e valores */}

            {pontos.map((ponto) => {
              const ativo = ponto.chave === idSelecionado;

              return (
                <React.Fragment key={`ponto-${ponto.chave}`}>
                  <Circle
                    cx={ponto.x}
                    cy={ponto.y}
                    r={ativo ? 8 : 5}
                    fill={ativo ? '#246B65' : C.teal}
                    stroke={C.white}
                    strokeWidth={2}
                  />

                  <SvgText
                    x={ponto.x}
                    y={Math.max(12, ponto.y - 12)}
                    fill={C.dark}
                    fontSize={11}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {ponto.valor}
                  </SvgText>

                  <SvgText
                    x={ponto.x}
                    y={altura - 19}
                    fill={C.gray}
                    fontSize={10}
                    textAnchor="middle"
                  >
                    {ponto.registro.data.slice(0, 5)}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>

          {/* Áreas clicáveis sobre os pontos */}

          <View
            pointerEvents="box-none"
            style={StyleSheet.absoluteFillObject}
          >
            {pontos.map((ponto) => (
              <Pressable
                key={`toque-${ponto.chave}`}
                accessibilityRole="button"
                accessibilityLabel={
                  `Ver medição de ${ponto.registro.data}, ` +
                  `${ponto.valor} mg/dL`
                }
                onPress={() =>
                  setIdSelecionado(ponto.chave)
                }
                style={{
                  position: 'absolute',
                  left: ponto.x - 20,
                  top: ponto.y - 20,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                }}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <Text style={styles.descricaoGrafico}>
        Toque em um ponto para visualizar os detalhes
        da medição.
      </Text>

      {/* DETALHES DO PONTO SELECIONADO */}

      {selecionado && (
        <View style={styles.detalhesPonto}>
          <Text style={styles.resumoTitulo}>
            Detalhes da medição
          </Text>

          <Text style={styles.infoResumo}>
            Glicemia: {selecionado.valor} mg/dL
          </Text>

          <Text style={styles.infoResumo}>
            Data: {selecionado.data}
          </Text>

          <Text style={styles.infoResumo}>
            Horário: {selecionado.horario}
          </Text>

          <Text style={styles.infoResumo}>
            Contexto: {selecionado.contexto}
          </Text>

          {!!selecionado.observacao && (
            <Text style={styles.infoResumo}>
              Observação: {selecionado.observacao}
            </Text>
          )}

          <TouchableOpacity
            onPress={() => setIdSelecionado(null)}
          >
            <Text style={styles.fecharDetalhes}>
              Fechar detalhes
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ========================================
// TELA PRINCIPAL
// ========================================

export default function GlicoseScreen() {
  const [registros, setRegistros] = useState<Glicemia[]>([]);
  const [form, setForm] = useState<Form>(inicial);

  const [editandoId, setEditandoId] = useState<string | null>(
    null
  );

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const [usuario, setUsuario] = useState<User | null>(null);

  // ========================================
  // FILTROS E ANÁLISE
  // ========================================

  const [periodoGrafico, setPeriodoGrafico] =
    useState<PeriodoGlicemia>('todos');

  const [contextoGrafico, setContextoGrafico] =
    useState('Todos');

  const registrosFiltrados = useMemo(
    () =>
      filtrarGlicemias(
        registros,
        periodoGrafico,
        contextoGrafico
      ),
    [registros, periodoGrafico, contextoGrafico]
  );

  const analise = useMemo(
    () => analisarGlicemias(registrosFiltrados),
    [registrosFiltrados]
  );

  // Exibe o aviso apenas se realmente existirem
  // medições de contextos diferentes.
  const possuiContextosDiferentes = useMemo(() => {
    const contextosEncontrados = new Set(
      registrosFiltrados.map(
        (registro) => registro.contexto
      )
    );

    return contextosEncontrados.size > 1;
  }, [registrosFiltrados]);

  // ========================================
  // FORMULÁRIO
  // ========================================

  function alterarCampo(campo: keyof Form, valor: string) {
    setForm((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function abrirNovo() {
    setForm(inicial);
    setEditandoId(null);
    setMostrarFormulario(true);
  }

  function abrirEdicao(registro: Glicemia) {
    if (!registro.id) return;

    setForm({
      valor: String(registro.valor),
      data: registro.data,
      horario: registro.horario,
      contexto: registro.contexto,
      observacao: registro.observacao ?? '',
    });

    setEditandoId(registro.id);
    setMostrarFormulario(true);
  }

  function cancelar() {
    setMostrarFormulario(false);
    setEditandoId(null);
    setForm(inicial);
  }

  // ========================================
  // CARREGAMENTO DO FIREBASE
  // ========================================

  const carregarRegistros = useCallback(
    async (userId: string): Promise<void> => {
      setCarregando(true);

      try {
        const dados = await listarGlicemias(userId);

        if (auth.currentUser?.uid !== userId) {
          return;
        }

        setRegistros(ordenarRegistros(dados));
      } catch (error) {
        console.error(
          'Erro ao carregar glicemias:',
          error
        );

        if (auth.currentUser?.uid === userId) {
          setRegistros([]);

          mostrarMensagem(
            'Erro',
            'Não foi possível carregar as medições.'
          );
        }
      } finally {
        setCarregando(false);
      }
    },
    []
  );

  // Aguarda a autenticação ser restaurada
  // e atualiza o histórico ao voltar à tela.
  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      const unsubscribe = onAuthStateChanged(
        auth,
        async (usuarioAtual) => {
          if (!ativo) return;

          setUsuario(usuarioAtual);

          if (usuarioAtual) {
            await carregarRegistros(usuarioAtual.uid);
          } else {
            setRegistros([]);
            setCarregando(false);
          }
        }
      );

      return () => {
        ativo = false;
        unsubscribe();
      };
    }, [carregarRegistros])
  );

  // ========================================
  // SALVAR / EDITAR
  // ========================================

  async function salvar() {
    const userId = auth.currentUser?.uid;

    if (!userId) {
      mostrarMensagem(
        'Atenção',
        'Faça login para registrar sua glicemia.'
      );
      return;
    }

    const valor = Number(
      form.valor.trim().replace(',', '.')
    );

    if (
      !form.valor.trim() ||
      !Number.isFinite(valor) ||
      valor <= 0
    ) {
      mostrarMensagem(
        'Valor inválido',
        'Informe um valor de glicemia válido.'
      );
      return;
    }

    if (!dataValida(form.data)) {
      mostrarMensagem(
        'Data inválida',
        'Informe uma data válida no formato DD/MM/AAAA.'
      );
      return;
    }

    if (!horarioValido(form.horario)) {
      mostrarMensagem(
        'Horário inválido',
        'Informe um horário válido no formato HH:MM.'
      );
      return;
    }

    if (!form.contexto) {
      mostrarMensagem(
        'Campo obrigatório',
        'Selecione o contexto da medição.'
      );
      return;
    }

    const dados = {
      valor,
      data: form.data,
      horario: form.horario,
      contexto: form.contexto,
      observacao: form.observacao,
    };

    const estavaEditando = editandoId !== null;

    setSalvando(true);

    try {
      if (editandoId) {
        await atualizarGlicemia(
          editandoId,
          userId,
          dados
        );
      } else {
        await criarGlicemia({
          ...dados,
          userId,
        });
      }

      cancelar();

      // Atualiza histórico, gráfico e feedback.
      await carregarRegistros(userId);

      mostrarMensagem(
        'Sucesso',
        estavaEditando
          ? 'Medição atualizada com sucesso!'
          : 'Medição registrada com sucesso!'
      );
    } catch (error) {
      console.error(
        'Erro ao salvar glicemia:',
        error
      );

      mostrarMensagem(
        'Erro',
        'Não foi possível salvar a medição.'
      );
    } finally {
      setSalvando(false);
    }
  }

  // ========================================
  // EXCLUSÃO
  // ========================================

  async function executarExclusao(registro: Glicemia) {
    const userId = auth.currentUser?.uid;

    if (!userId || !registro.id || excluindo) {
      return;
    }

    setExcluindo(true);

    try {
      await excluirGlicemia(registro.id, userId);

      await carregarRegistros(userId);

      mostrarMensagem(
        'Sucesso',
        'Medição excluída com sucesso.'
      );
    } catch (error) {
      console.error(
        'Erro ao excluir glicemia:',
        error
      );

      mostrarMensagem(
        'Erro',
        'Não foi possível excluir a medição.'
      );
    } finally {
      setExcluindo(false);
    }
  }

  function confirmarExclusao(registro: Glicemia) {
    if (Platform.OS === 'web') {
      const confirmar = window.confirm(
        'Deseja realmente excluir esta medição?'
      );

      if (confirmar) {
        void executarExclusao(registro);
      }

      return;
    }

    Alert.alert(
      'Excluir medição',
      'Deseja realmente excluir este registro?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            void executarExclusao(registro);
          },
        },
      ]
    );
  }

  // ========================================
  // INTERFACE
  // ========================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.conteudo}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.titulo}>
        Minha glicemia
      </Text>

      <Text style={styles.descricao}>
        Acompanhe e registre suas medições de glicose.
      </Text>

      {!usuario && !carregando && (
        <Text style={styles.aviso}>
          Faça login para visualizar e registrar medições.
        </Text>
      )}

      {/* =====================================
          CADASTRO E EDIÇÃO
      ===================================== */}

      {!mostrarFormulario ? (
        <TouchableOpacity
          style={[
            styles.botao,
            !usuario && styles.desabilitado,
          ]}
          onPress={abrirNovo}
          disabled={!usuario}
        >
          <Text style={styles.botaoTexto}>
            + Registrar nova medição
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.formulario}>
          <Text style={styles.subtitulo}>
            {editandoId
              ? 'Editar medição'
              : 'Nova medição'}
          </Text>

          <Text style={styles.label}>
            Glicemia (mg/dL)
          </Text>

          <TextInput
            style={styles.input}
            value={form.valor}
            onChangeText={(valor) =>
              alterarCampo('valor', valor)
            }
            keyboardType="decimal-pad"
            placeholder="Ex.: 105"
          />

          <Text style={styles.label}>
            Data
          </Text>

          <TextInput
            style={styles.input}
            value={form.data}
            onChangeText={(valor) =>
              alterarCampo(
                'data',
                formatarData(valor)
              )
            }
            keyboardType="numeric"
            placeholder="DD/MM/AAAA"
            maxLength={10}
          />

          <Text style={styles.label}>
            Horário
          </Text>

          <TextInput
            style={styles.input}
            value={form.horario}
            onChangeText={(valor) =>
              alterarCampo(
                'horario',
                formatarHorario(valor)
              )
            }
            keyboardType="numeric"
            placeholder="HH:MM"
            maxLength={5}
          />

          <Text style={styles.label}>
            Contexto da medição
          </Text>

          <View style={styles.contextos}>
            {contextos.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.contextoBotao,
                  form.contexto === item &&
                    styles.contextoSelecionado,
                ]}
                onPress={() =>
                  alterarCampo('contexto', item)
                }
              >
                <Text
                  style={[
                    styles.contextoTexto,
                    form.contexto === item &&
                      styles.contextoTextoSelecionado,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>
            Observação (opcional)
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.observacao,
            ]}
            value={form.observacao}
            onChangeText={(valor) =>
              alterarCampo('observacao', valor)
            }
            placeholder="Adicione uma observação"
            multiline
          />

          <TouchableOpacity
            style={[
              styles.botao,
              salvando && styles.desabilitado,
            ]}
            onPress={salvar}
            disabled={salvando}
          >
            <Text style={styles.botaoTexto}>
              {salvando
                ? 'Salvando...'
                : editandoId
                  ? 'Salvar alterações'
                  : 'Salvar medição'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={cancelar}
            disabled={salvando}
          >
            <Text style={styles.cancelar}>
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* =====================================
          GRÁFICO DE EVOLUÇÃO
      ===================================== */}

      {usuario && (
        <View style={styles.graficoCard}>
          <Text style={styles.subtitulo}>
            Evolução da glicemia
          </Text>

          <Text style={styles.descricaoGrafico}>
            Acompanhe os valores das suas medições ao
            longo do tempo.
          </Text>

          {/* FILTRO POR PERÍODO */}

          <Text style={styles.label}>
            Período
          </Text>

          <View style={styles.contextos}>
            {periodos.map((item) => (
              <TouchableOpacity
                key={item.texto}
                style={[
                  styles.contextoBotao,
                  periodoGrafico === item.valor &&
                    styles.contextoSelecionado,
                ]}
                onPress={() =>
                  setPeriodoGrafico(item.valor)
                }
              >
                <Text
                  style={[
                    styles.contextoTexto,
                    periodoGrafico === item.valor &&
                      styles.contextoTextoSelecionado,
                  ]}
                >
                  {item.texto}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* FILTRO POR CONTEXTO */}

          <Text style={styles.label}>
            Contexto
          </Text>

          <View style={styles.contextos}>
            {['Todos', ...contextos].map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.contextoBotao,
                  contextoGrafico === item &&
                    styles.contextoSelecionado,
                ]}
                onPress={() =>
                  setContextoGrafico(item)
                }
              >
                <Text
                  style={[
                    styles.contextoTexto,
                    contextoGrafico === item &&
                      styles.contextoTextoSelecionado,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* GRÁFICO INTERATIVO */}

          {carregando ? (
            <ActivityIndicator
              color={C.teal}
              size="large"
            />
          ) : registrosFiltrados.length === 0 ? (
            <Text style={styles.vazio}>
              Nenhuma medição encontrada para os
              filtros selecionados.
            </Text>
          ) : (
            <GraficoGlicemia
              registros={registrosFiltrados}
            />
          )}

          {/* RESUMO E FEEDBACK */}

          {!carregando && (
            <View style={styles.resumo}>
              <Text style={styles.resumoTitulo}>
                Resumo das medições
              </Text>

              <Text style={styles.infoResumo}>
                Quantidade: {analise.quantidade}
              </Text>

              <Text style={styles.infoResumo}>
                Média:{' '}
                {analise.media === null
                  ? '—'
                  : `${analise.media.toFixed(1)} mg/dL`}
              </Text>

              <Text style={styles.infoResumo}>
                Menor valor:{' '}
                {analise.menorValor === null
                  ? '—'
                  : `${analise.menorValor} mg/dL`}
              </Text>

              <Text style={styles.infoResumo}>
                Maior valor:{' '}
                {analise.maiorValor === null
                  ? '—'
                  : `${analise.maiorValor} mg/dL`}
              </Text>

              <Text style={styles.resumoTitulo}>
                Análise das medições
              </Text>

              {contextoGrafico === 'Todos' &&
                possuiContextosDiferentes && (
                  <Text style={styles.avisoAnalise}>
                    As medições incluem diferentes
                    contextos. Para uma comparação mais
                    consistente, selecione um contexto
                    específico.
                  </Text>
                )}

              <Text style={styles.infoResumo}>
                {analise.feedback}
              </Text>

              <Text style={styles.nota}>
                Esta análise é informativa e não
                substitui a avaliação de um
                profissional de saúde.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* =====================================
          HISTÓRICO DE MEDIÇÕES
      ===================================== */}

      <Text style={styles.subtitulo}>
        Histórico de medições
      </Text>

      {carregando ? (
        <ActivityIndicator
          size="large"
          color={C.teal}
        />
      ) : registros.length === 0 ? (
        <Text style={styles.vazio}>
          Nenhuma medição registrada ainda.
        </Text>
      ) : (
        registros.map((registro) => (
          <View
            key={registro.id}
            style={styles.registro}
          >
            <Text style={styles.valor}>
              {registro.valor} mg/dL
            </Text>

            <Text style={styles.info}>
              {registro.data} às {registro.horario}
            </Text>

            <Text style={styles.info}>
              {registro.contexto}
            </Text>

            {!!registro.observacao && (
              <Text style={styles.info}>
                {registro.observacao}
              </Text>
            )}

            <View style={styles.acoes}>
              <TouchableOpacity
                onPress={() =>
                  abrirEdicao(registro)
                }
              >
                <Text style={styles.editar}>
                  Editar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  confirmarExclusao(registro)
                }
                disabled={excluindo}
              >
                <Text style={styles.excluir}>
                  {excluindo
                    ? 'Excluindo...'
                    : 'Excluir'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ========================================
// ESTILOS
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  conteudo: {
    padding: 20,
    paddingBottom: 50,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },

  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: C.dark,
  },

  descricao: {
    fontSize: 14,
    color: C.gray,
    marginTop: 6,
    marginBottom: 20,
  },

  subtitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: C.dark,
    marginBottom: 12,
    marginTop: 16,
  },

  botao: {
    backgroundColor: C.teal,
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginVertical: 12,
  },

  botaoTexto: {
    color: C.white,
    fontWeight: '700',
  },

  formulario: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  label: {
    fontSize: 13,
    color: C.dark,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: C.dark,
    backgroundColor: C.white,
  },

  observacao: {
    minHeight: 75,
    textAlignVertical: 'top',
  },

  contextos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },

  contextoBotao: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },

  contextoSelecionado: {
    backgroundColor: C.teal,
    borderColor: C.teal,
  },

  contextoTexto: {
    color: C.dark,
    fontSize: 12,
  },

  contextoTextoSelecionado: {
    color: C.white,
  },

  cancelar: {
    color: C.gray,
    textAlign: 'center',
    padding: 12,
  },

  desabilitado: {
    opacity: 0.5,
  },

  aviso: {
    color: C.error,
    fontSize: 14,
    marginBottom: 12,
  },

  vazio: {
    color: C.gray,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },

  // GRÁFICO

  graficoCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    marginBottom: 12,
  },

  descricaoGrafico: {
    color: C.gray,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 14,
  },

  rolagemGrafico: {
    marginTop: 14,
    marginBottom: 8,
  },

  detalhesPonto: {
    backgroundColor: '#EAF4F2',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 12,
  },

  fecharDetalhes: {
    color: C.teal,
    fontWeight: '700',
    marginTop: 8,
  },

  // RESUMO

  resumo: {
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },

  resumoTitulo: {
    color: C.dark,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 6,
  },

  infoResumo: {
    color: C.dark,
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 7,
  },

  avisoAnalise: {
    color: '#9A651D',
    fontSize: 12,
    lineHeight: 19,
    marginBottom: 10,
  },

  nota: {
    color: C.gray,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 12,
  },

  // HISTÓRICO

  registro: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    marginVertical: 6,
  },

  valor: {
    fontSize: 20,
    fontWeight: '700',
    color: C.dark,
  },

  info: {
    color: C.gray,
    fontSize: 13,
    marginTop: 4,
  },

  acoes: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 14,
  },

  editar: {
    color: C.teal,
    fontWeight: '700',
  },

  excluir: {
    color: C.error,
    fontWeight: '700',
  },
});
