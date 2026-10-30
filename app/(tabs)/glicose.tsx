import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { auth } from '@/firebaseConfig';
import {
  atualizarGlicemia,
  excluirGlicemia,
  listarGlicemias,
} from '@/services/glicemiaService';
import type { Glicemia } from '@/services/glicemiaService';
import {
  analisarGlicemias,
  filtrarGlicemias,
} from '@/services/glicemiaAnaliseService';
import type { PeriodoGlicemia } from '@/services/glicemiaAnaliseService';
const C = {
  bg: '#F4F8F7',
  card: '#FFFFFF',
  primary: '#0E9F8C',
  primaryDark: '#0E766D',
  primarySoft: '#E7F8F4',
  text: '#273331',
  muted: '#7E8D89',
  border: '#E0EAE8',
  danger: '#D94B57',
  dangerSoft: '#FDE8EA',
  warning: '#B7791F',
  warningSoft: '#FFF3D6',
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
type FormEdicao = {
  valor: string;
  data: string;
  horario: string;
  contexto: string;
  observacao: string;
};
const formVazio: FormEdicao = {
  valor: '',
  data: '',
  horario: '',
  contexto: '',
  observacao: '',
};
function formatarData(valor: string) {
  const numeros = valor.replace(/\D/g, '').slice(0, 8);
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 4) {
    return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
  }
  return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
}
function formatarHorario(valor: string) {
  const numeros = valor.replace(/\D/g, '').slice(0, 4);
  if (numeros.length <= 2) return numeros;
  return `${numeros.slice(0, 2)}:${numeros.slice(2)}`;
}
function dataValida(valor: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) return false;
  const [dia, mes, ano] = valor.split('/').map(Number);
  if (ano < 1900 || mes < 1 || mes > 12 || dia < 1) return false;
  return dia <= new Date(ano, mes, 0).getDate();
}
function horarioValido(valor: string) {
  if (!/^\d{2}:\d{2}$/.test(valor)) return false;
  const [hora, minuto] = valor.split(':').map(Number);
  return hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59;
}
function timestampRegistro(registro: Glicemia) {
  const [dia, mes, ano] = registro.data.split('/').map(Number);
  const [hora, minuto] = registro.horario.split(':').map(Number);
  return new Date(ano, mes - 1, dia, hora || 0, minuto || 0).getTime();
}
function ordenarRegistros(registros: Glicemia[]) {
  return [...registros].sort(
    (a, b) => timestampRegistro(b) - timestampRegistro(a)
  );
}
function mostrarMensagem(titulo: string, mensagem: string) {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensagem}`);
    return;
  }
  Alert.alert(titulo, mensagem);
}
function classificarValor(valor: number) {
  if (valor < 70) {
    return {
      texto: 'Baixa',
      cor: C.danger,
      fundo: C.dangerSoft,
    };
  }
  if (valor > 180) {
    return {
      texto: 'Elevada',
      cor: C.warning,
      fundo: C.warningSoft,
    };
  }
  return {
    texto: 'Registrada',
    cor: C.primaryDark,
    fundo: C.primarySoft,
  };
}
function GraficoGlicemia({ registros }: { registros: Glicemia[] }) {
  const ordem = [...registros].sort(
    (a, b) => timestampRegistro(a) - timestampRegistro(b)
  );
  const largura = Math.max(310, ordem.length * 64 + 60);
  const altura = 220;
  const esquerda = 42;
  const direita = 22;
  const topo = 26;
  const baixo = 38;
  const areaLargura = largura - esquerda - direita;
  const areaAltura = altura - topo - baixo;
  const valores = ordem.map((r) => Number(r.valor));
  const menor = Math.min(...valores);
  const maior = Math.max(...valores);
  const margem = Math.max(15, (maior - menor) * 0.15);
  const minimo = Math.max(0, menor - margem);
  const maximo = maior + margem;
  const intervalo = Math.max(1, maximo - minimo);
  const pontos = ordem.map((registro, indice) => {
    const x =
      ordem.length === 1
        ? esquerda + areaLargura / 2
        : esquerda + (indice / (ordem.length - 1)) * areaLargura;
    const y = topo + ((maximo - Number(registro.valor)) / intervalo) * areaAltura;
    return { x, y, registro };
  });
  const linha = pontos.map((p) => `${p.x},${p.y}`).join(' ');
  const marcas = Array.from({ length: 4 }, (_, indice) => {
    const fracao = indice / 3;
    return {
      y: topo + fracao * areaAltura,
      valor: maximo - fracao * intervalo,
    };
  });
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ width: largura, height: altura }}>
        <Svg width={largura} height={altura}>
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
                fill={C.muted}
                fontSize={9}
                textAnchor="end"
              >
                {marca.valor.toFixed(0)}
              </SvgText>
            </React.Fragment>
          ))}
          {pontos.length > 1 && (
            <Polyline
              points={linha}
              fill="none"
              stroke={C.primary}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {pontos.map((ponto, indice) => (
            <React.Fragment key={ponto.registro.id ?? indice}>
              <Circle
                cx={ponto.x}
                cy={ponto.y}
                r={5}
                fill={C.primary}
                stroke={C.card}
                strokeWidth={2}
              />
              <SvgText
                x={ponto.x}
                y={Math.max(12, ponto.y - 11)}
                fill={C.text}
                fontSize={10}
                fontWeight="bold"
                textAnchor="middle"
              >
                {ponto.registro.valor}
              </SvgText>
              <SvgText
                x={ponto.x}
                y={altura - 13}
                fill={C.muted}
                fontSize={9}
                textAnchor="middle"
              >
                {ponto.registro.data.slice(0, 5)}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </View>
    </ScrollView>
  );
}

function RegistroDeslizavel({
  children,
  onEditar,
  onExcluir,
  excluindo,
}: {
  children: React.ReactNode;
  onEditar: () => void;
  onExcluir: () => void;
  excluindo: boolean;
}) {
  const deslocamento = useRef(new Animated.Value(0)).current;
  const aberto = useRef(false);
  const larguraAcoes = 136;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesto) =>
        Math.abs(gesto.dx) > 8 && Math.abs(gesto.dx) > Math.abs(gesto.dy),
      onPanResponderMove: (_, gesto) => {
        const base = aberto.current ? -larguraAcoes : 0;
        deslocamento.setValue(Math.max(-larguraAcoes, Math.min(0, base + gesto.dx)));
      },
      onPanResponderRelease: (_, gesto) => {
        const abrir = aberto.current ? gesto.dx <= 55 : gesto.dx < -45;
        aberto.current = abrir;
        Animated.spring(deslocamento, {
          toValue: abrir ? -larguraAcoes : 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
      },
    })
  ).current;
  const fechar = () => {
    aberto.current = false;
    Animated.spring(deslocamento, { toValue: 0, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.swipeAcoes}>
        <Pressable style={styles.swipeEditar} onPress={() => { fechar(); onEditar(); }}>
          <Ionicons name="create-outline" size={19} color="#FFFFFF" />
          <Text style={styles.swipeAcaoTexto}>Editar</Text>
        </Pressable>
        <Pressable style={styles.swipeExcluir} onPress={() => { fechar(); onExcluir(); }} disabled={excluindo}>
          <Ionicons name="trash-outline" size={19} color="#FFFFFF" />
          <Text style={styles.swipeAcaoTexto}>{excluindo ? 'Aguarde' : 'Excluir'}</Text>
        </Pressable>
      </View>
      <Animated.View
        style={[styles.swipeConteudo, { transform: [{ translateX: deslocamento }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

export default function GlicoseScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [registros, setRegistros] = useState<Glicemia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormEdicao>(formVazio);
  const [periodoGrafico, setPeriodoGrafico] =
    useState<PeriodoGlicemia>('todos');
  const [contextoGrafico, setContextoGrafico] = useState('Todos');
  const registrosFiltrados = useMemo(
    () => filtrarGlicemias(registros, periodoGrafico, contextoGrafico),
    [registros, periodoGrafico, contextoGrafico]
  );
  const analise = useMemo(
    () => analisarGlicemias(registrosFiltrados),
    [registrosFiltrados]
  );
  const ultimaMedicao = registros[0] ?? null;
  const carregarRegistros = useCallback(async (userId: string) => {
    setCarregando(true);
    try {
      const dados = await listarGlicemias(userId);
      if (auth.currentUser?.uid !== userId) return;
      setRegistros(ordenarRegistros(dados));
    } catch (error) {
      console.error('Erro ao carregar glicemias:', error);
      setRegistros([]);
      mostrarMensagem('Erro', 'Não foi possível carregar as medições.');
    } finally {
      setCarregando(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      const unsubscribe = onAuthStateChanged(auth, async (usuarioAtual) => {
        if (!ativo) return;
        setUsuario(usuarioAtual);
        if (!usuarioAtual) {
          setRegistros([]);
          setCarregando(false);
          return;
        }
        await carregarRegistros(usuarioAtual.uid);
      });
      return () => {
        ativo = false;
        unsubscribe();
      };
    }, [carregarRegistros])
  );
  function abrirEdicao(registro: Glicemia) {
    if (!registro.id) return;
    setEditandoId(registro.id);
    setForm({
      valor: String(registro.valor),
      data: registro.data,
      horario: registro.horario,
      contexto: registro.contexto,
      observacao: registro.observacao ?? '',
    });
  }
  function cancelarEdicao() {
    setEditandoId(null);
    setForm(formVazio);
  }
  function alterarCampo(campo: keyof FormEdicao, valor: string) {
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
  }
  async function salvarEdicao() {
    const userId = auth.currentUser?.uid;
    if (!userId || !editandoId) return;
    const valor = Number(form.valor.trim().replace(',', '.'));
    if (!Number.isFinite(valor) || valor < 20 || valor > 600) {
      mostrarMensagem(
        'Valor inválido',
        'Informe um valor de glicose entre 20 e 600 mg/dL.'
      );
      return;
    }
    if (!dataValida(form.data)) {
      mostrarMensagem('Data inválida', 'Informe uma data válida no formato DD/MM/AAAA.');
      return;
    }
    if (!horarioValido(form.horario)) {
      mostrarMensagem('Horário inválido', 'Informe um horário válido no formato HH:MM.');
      return;
    }
    if (!form.contexto) {
      mostrarMensagem('Campo obrigatório', 'Selecione o contexto da medição.');
      return;
    }
    setSalvando(true);
    try {
      await atualizarGlicemia(editandoId, userId, {
        valor,
        data: form.data,
        horario: form.horario,
        contexto: form.contexto,
        observacao: form.observacao,
      });
      cancelarEdicao();
      await carregarRegistros(userId);
      mostrarMensagem('Sucesso', 'Medição atualizada com sucesso.');
    } catch (error) {
      console.error('Erro ao atualizar glicemia:', error);
      mostrarMensagem('Erro', 'Não foi possível atualizar a medição.');
    } finally {
      setSalvando(false);
    }
  }
  async function executarExclusao(registro: Glicemia) {
    const userId = auth.currentUser?.uid;
    if (!userId || !registro.id) return;
    setExcluindoId(registro.id);
    try {
      await excluirGlicemia(registro.id, userId);
      if (editandoId === registro.id) cancelarEdicao();
      await carregarRegistros(userId);
      mostrarMensagem('Sucesso', 'Medição excluída com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir glicemia:', error);
      mostrarMensagem('Erro', 'Não foi possível excluir a medição.');
    } finally {
      setExcluindoId(null);
    }
  }
  function confirmarExclusao(registro: Glicemia) {
    if (Platform.OS === 'web') {
      if (window.confirm('Deseja realmente excluir esta medição?')) {
        void executarExclusao(registro);
      }
      return;
    }
    Alert.alert('Excluir medição', 'Deseja realmente excluir este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => void executarExclusao(registro),
      },
    ]);
  }
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.titulo}>Glicose</Text>
              <Text style={styles.descricao}>
                Acompanhe suas medições de glicemia.
              </Text>
            </View>
            <View style={styles.headerIcon}>
              <Ionicons name="water-outline" size={22} color={C.primaryDark} />
            </View>
          </View>
          {!usuario && !carregando && (
            <View style={styles.avisoCard}>
              <Text style={styles.avisoTexto}>
                Faça login para visualizar e registrar medições.
              </Text>
            </View>
          )}
          {carregando ? (
            <View style={styles.loading}>
              <ActivityIndicator color={C.primary} />
              <Text style={styles.loadingTexto}>Carregando medições...</Text>
            </View>
          ) : (
            <>
              <View style={styles.ultimaCard}>
                <View style={styles.cardTopRow}>
                  <View>
                    <Text style={styles.cardLabel}>Última medição</Text>
                    <Text style={styles.cardDescricao}>
                      Registro mais recente de glicemia
                    </Text>
                  </View>
                  {ultimaMedicao && (
                    <View
                      style={[
                        styles.statusTag,
                        { backgroundColor: classificarValor(ultimaMedicao.valor).fundo },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusTagTexto,
                          { color: classificarValor(ultimaMedicao.valor).cor },
                        ]}
                      >
                        {classificarValor(ultimaMedicao.valor).texto}
                      </Text>
                    </View>
                  )}
                </View>
                {ultimaMedicao ? (
                  <>
                    <View style={styles.valorRow}>
                      <Text style={styles.valorPrincipal}>{ultimaMedicao.valor}</Text>
                      <Text style={styles.unidade}>mg/dL</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={15} color={C.muted} />
                      <Text style={styles.metaTexto}>
                        {ultimaMedicao.data} • {ultimaMedicao.horario}
                      </Text>
                    </View>
                    <View style={styles.contextoAtual}>
                      <Ionicons name="restaurant-outline" size={15} color={C.primaryDark} />
                      <Text style={styles.contextoAtualTexto}>
                        {ultimaMedicao.contexto}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.estadoVazioInterno}>
                    <Ionicons name="water-outline" size={28} color="#B8C4C1" />
                    <Text style={styles.estadoVazioTitulo}>Nenhuma medição ainda</Text>
                    <Text style={styles.estadoVazioTexto}>
                      Registre sua primeira glicemia para começar o acompanhamento.
                    </Text>
                  </View>
                )}
              </View>
              <Pressable
                style={styles.registrarCard}
                onPress={() =>
                  router.push({
                    pathname: '/novo-registro',
                    params: { tipo: 'glicose' },
                  })
                }
                disabled={!usuario}
              >
                <View style={styles.registrarIcone}>
                  <Ionicons name="add" size={24} color={C.primary} />
                </View>
                <View style={styles.registrarConteudo}>
                  <Text style={styles.registrarTitulo}>Registrar glicose</Text>
                  <Text style={styles.registrarDescricao}>
                    Adicione uma nova medição ao seu histórico.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={C.primaryDark} />
              </Pressable>
              <View style={styles.evolucaoCard}>
                <Text style={styles.secaoTitulo}>Evolução da glicemia</Text>
                <Text style={styles.secaoDescricao}>
                  Filtre suas medições por período e contexto.
                </Text>
                <Text style={styles.filtroLabel}>Período</Text>
                <View style={styles.filtrosWrap}>
                  {periodos.map((item) => (
                    <Pressable
                      key={item.texto}
                      style={[
                        styles.filtroBotao,
                        periodoGrafico === item.valor && styles.filtroBotaoAtivo,
                      ]}
                      onPress={() => setPeriodoGrafico(item.valor)}
                    >
                      <Text
                        style={[
                          styles.filtroTexto,
                          periodoGrafico === item.valor && styles.filtroTextoAtivo,
                        ]}
                      >
                        {item.texto}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.filtroLabel}>Contexto</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.contextosScroll}
                >
                  {['Todos', ...contextos].map((item) => (
                    <Pressable
                      key={item}
                      style={[
                        styles.filtroBotao,
                        contextoGrafico === item && styles.filtroBotaoAtivo,
                      ]}
                      onPress={() => setContextoGrafico(item)}
                    >
                      <Text
                        style={[
                          styles.filtroTexto,
                          contextoGrafico === item && styles.filtroTextoAtivo,
                        ]}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {registrosFiltrados.length === 0 ? (
                  <View style={styles.graficoVazio}>
                    <Ionicons name="analytics-outline" size={30} color="#B8C4C1" />
                    <Text style={styles.estadoVazioTexto}>
                      Nenhuma medição encontrada para os filtros selecionados.
                    </Text>
                  </View>
                ) : (
                  <GraficoGlicemia registros={registrosFiltrados} />
                )}
              </View>
              {analise.quantidade > 0 && (
                <View style={styles.feedbackCard}>
                  <Text style={styles.secaoTitulo}>Análise das medições</Text>
                  <View style={styles.feedbackBox}>
                    <Ionicons name="information-circle-outline" size={19} color={C.primaryDark} />
                    <Text style={styles.feedbackTexto}>{analise.feedback}</Text>
                  </View>
                </View>
              )}

              <View style={styles.historicoHeader}>
                <Text style={styles.secaoTitulo}>Medições recentes</Text>
                <Text style={styles.historicoContagem}>
                  {registros.length} {registros.length === 1 ? 'registro' : 'registros'}
                </Text>
              </View>
              {registros.length > 0 && (
                <Text style={styles.swipeInstrucao}>Deslize um registro para a esquerda para editar ou excluir.</Text>
              )}
              {registros.length === 0 ? (
                <View style={styles.historicoVazio}>
                  <Ionicons name="document-text-outline" size={30} color="#B8C4C1" />
                  <Text style={styles.estadoVazioTitulo}>Seu histórico está vazio</Text>
                  <Text style={styles.estadoVazioTexto}>
                    As novas medições aparecerão aqui.
                  </Text>
                </View>
              ) : (
                <View style={styles.historicoLista}>
                  {registros.map((registro) => {
                    const status = classificarValor(registro.valor);
                    return (
                      <RegistroDeslizavel
                        key={registro.id}
                        onEditar={() => abrirEdicao(registro)}
                        onExcluir={() => confirmarExclusao(registro)}
                        excluindo={excluindoId === registro.id}
                      >
                        <View style={styles.registroCard}>
                        <View style={styles.registroTopo}>
                          <View>
                            <View style={styles.registroValorRow}>
                              <Text style={styles.registroValor}>{registro.valor}</Text>
                              <Text style={styles.registroUnidade}>mg/dL</Text>
                            </View>
                            <Text style={styles.registroData}>
                              {registro.data} • {registro.horario}
                            </Text>
                          </View>
                          <View style={[styles.statusTag, { backgroundColor: status.fundo }]}>
                            <Text style={[styles.statusTagTexto, { color: status.cor }]}>
                              {status.texto}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.registroContextoRow}>
                          <Ionicons name="restaurant-outline" size={14} color={C.muted} />
                          <Text style={styles.registroContexto}>{registro.contexto}</Text>
                        </View>
                        {!!registro.observacao && (
                          <Text style={styles.registroObservacao}>{registro.observacao}</Text>
                        )}
                        {editandoId === registro.id && (
                          <View style={styles.edicaoInline}>
                            <View style={styles.edicaoHeader}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.edicaoTitulo}>Editar medição</Text>
                                <Text style={styles.edicaoDescricao}>
                                  Altere os dados e salve para atualizar o histórico.
                                </Text>
                              </View>
                              <Pressable
                                style={styles.fecharEdicao}
                                onPress={cancelarEdicao}
                                accessibilityLabel="Cancelar edição"
                              >
                                <Ionicons name="close" size={20} color={C.muted} />
                              </Pressable>
                            </View>
                            <Text style={styles.label}>Glicemia (mg/dL)</Text>
                            <TextInput
                              value={form.valor}
                              onChangeText={(valor) =>
                                alterarCampo('valor', valor.replace(/\D/g, '').slice(0, 3))
                              }
                              keyboardType="numeric"
                              style={styles.input}
                              maxLength={3}
                            />
                            <View style={styles.camposRow}>
                              <View style={styles.campoMetade}>
                                <Text style={styles.label}>Data</Text>
                                <TextInput
                                  value={form.data}
                                  onChangeText={(valor) =>
                                    alterarCampo('data', formatarData(valor))
                                  }
                                  keyboardType="numeric"
                                  style={styles.input}
                                  maxLength={10}
                                  placeholder="DD/MM/AAAA"
                                  placeholderTextColor="#A9B5B2"
                                />
                              </View>
                              <View style={styles.campoMetade}>
                                <Text style={styles.label}>Horário</Text>
                                <TextInput
                                  value={form.horario}
                                  onChangeText={(valor) =>
                                    alterarCampo('horario', formatarHorario(valor))
                                  }
                                  keyboardType="numeric"
                                  style={styles.input}
                                  maxLength={5}
                                  placeholder="HH:MM"
                                  placeholderTextColor="#A9B5B2"
                                />
                              </View>
                            </View>
                            <Text style={styles.label}>Contexto</Text>
                            <View style={styles.filtrosWrap}>
                              {contextos.map((item) => (
                                <Pressable
                                  key={item}
                                  style={[
                                    styles.filtroBotao,
                                    form.contexto === item && styles.filtroBotaoAtivo,
                                  ]}
                                  onPress={() => alterarCampo('contexto', item)}
                                >
                                  <Text
                                    style={[
                                      styles.filtroTexto,
                                      form.contexto === item && styles.filtroTextoAtivo,
                                    ]}
                                  >
                                    {item}
                                  </Text>
                                </Pressable>
                              ))}
                            </View>
                            <Text style={styles.label}>Observação</Text>
                            <TextInput
                              value={form.observacao}
                              onChangeText={(valor) => alterarCampo('observacao', valor)}
                              style={[styles.input, styles.observacaoInput]}
                              multiline
                              textAlignVertical="top"
                              placeholder="Opcional"
                              placeholderTextColor="#A9B5B2"
                            />
                            <View style={styles.edicaoBotoes}>
                              <Pressable
                                style={styles.botaoSecundario}
                                onPress={cancelarEdicao}
                                disabled={salvando}
                              >
                                <Text style={styles.botaoSecundarioTexto}>Cancelar</Text>
                              </Pressable>
                              <Pressable
                                style={[
                                  styles.botaoPrimarioInline,
                                  salvando && styles.desabilitado,
                                ]}
                                onPress={salvarEdicao}
                                disabled={salvando}
                              >
                                <Text style={styles.botaoPrimarioTexto}>
                                  {salvando ? 'Salvando...' : 'Salvar alterações'}
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        )}
                        </View>
                      </RegistroDeslizavel>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titulo: {
    fontSize: 25,
    fontWeight: '700',
    color: C.text,
  },
  descricao: {
    fontSize: 13,
    color: C.muted,
    marginTop: 4,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingTexto: {
    color: C.muted,
    fontSize: 13,
  },
  avisoCard: {
    backgroundColor: C.dangerSoft,
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  avisoTexto: {
    color: C.danger,
    fontSize: 13,
  },
  ultimaCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8EFED',
    padding: 18,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  cardDescricao: {
    fontSize: 11,
    color: C.muted,
    marginTop: 3,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusTagTexto: {
    fontSize: 10,
    fontWeight: '700',
  },
  valorRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginTop: 18,
  },
  valorPrincipal: {
    fontSize: 36,
    fontWeight: '800',
    color: C.primary,
  },
  unidade: {
    fontSize: 12,
    color: C.muted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  metaTexto: {
    fontSize: 12,
    color: C.muted,
  },
  contextoAtual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: C.primarySoft,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  contextoAtualTexto: {
    fontSize: 11,
    fontWeight: '600',
    color: C.primaryDark,
  },
  estadoVazioInterno: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  estadoVazioTitulo: {
    color: C.text,
    fontWeight: '700',
    fontSize: 14,
    marginTop: 8,
  },
  estadoVazioTexto: {
    color: C.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 5,
  },
  registrarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8EFED',
    padding: 16,
    marginBottom: 12,
  },
  registrarIcone: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  registrarConteudo: {
    flex: 1,
  },
  registrarTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  registrarDescricao: {
    fontSize: 11,
    color: C.muted,
    marginTop: 3,
  },
  edicaoCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginBottom: 12,
  },
  edicaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secaoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  secaoDescricao: {
    fontSize: 12,
    color: C.muted,
    marginTop: 4,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#52615E',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#F8FAFA',
    paddingHorizontal: 12,
    fontSize: 13,
    color: C.text,
  },
  camposRow: {
    flexDirection: 'row',
    gap: 10,
  },
  campoMetade: {
    flex: 1,
  },
  observacaoInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  botaoPrimario: {
    height: 48,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  botaoPrimarioTexto: {
    color: C.card,
    fontWeight: '700',
    fontSize: 13,
  },
  desabilitado: {
    opacity: 0.55,
  },
  evolucaoCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8EFED',
    padding: 18,
    marginBottom: 12,
  },
  filtroLabel: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 7,
  },
  filtrosWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contextosScroll: {
    gap: 8,
    paddingRight: 6,
  },
  filtroBotao: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  filtroBotaoAtivo: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filtroTexto: {
    fontSize: 11,
    color: C.text,
  },
  filtroTextoAtivo: {
    color: C.card,
    fontWeight: '700',
  },
  graficoVazio: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  feedbackCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EFED',
    padding: 15,
    marginBottom: 14,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.primarySoft,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  feedbackTexto: {
    flex: 1,
    color: '#45635E',
    fontSize: 11,
    lineHeight: 17,
  },
  historicoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historicoContagem: {
    fontSize: 10,
    color: C.muted,
  },
  historicoVazio: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EFED',
  },
  historicoLista: {
    gap: 10,
  },
  registroCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EFED',
    padding: 11,
  },
  registroTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  registroValorRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  registroValor: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  registroUnidade: {
    fontSize: 10,
    color: C.muted,
  },
  registroData: {
    fontSize: 11,
    color: C.muted,
    marginTop: 4,
  },
  registroContextoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  registroContexto: {
    fontSize: 11,
    color: C.muted,
  },
  registroObservacao: {
    fontSize: 11,
    color: '#52615E',
    lineHeight: 17,
    marginTop: 8,
  },
  edicaoInline: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E8EFED',
  },
  edicaoTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  edicaoDescricao: {
    fontSize: 10,
    color: C.muted,
    marginTop: 3,
    lineHeight: 15,
  },
  fecharEdicao: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F8F7',
  },
  edicaoBotoes: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  botaoSecundario: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoSecundarioTexto: {
    color: C.text,
    fontSize: 12,
    fontWeight: '700',
  },
  botaoPrimarioInline: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeInstrucao: {
    color: C.muted,
    fontSize: 10,
    marginBottom: 8,
    marginTop: -2,
  },
  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
  },
  swipeAcoes: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  swipeEditar: {
    width: 68,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  swipeExcluir: {
    width: 68,
    backgroundColor: C.danger,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  swipeAcaoTexto: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  swipeConteudo: {
    backgroundColor: C.card,
  },

});
