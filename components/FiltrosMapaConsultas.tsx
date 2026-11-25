
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type PeriodoMapa =
  | 'todas'
  | 'hoje'
  | 'amanha'
  | '7dias';

export type StatusMapa =
  | 'ativas'
  | 'todas'
  | 'confirmada'
  | 'aguardando_confirmacao'
  | 'recusada'
  | 'cancelada'
  | 'registro_pessoal';

export type FiltrosMapa = {
  periodo: PeriodoMapa;
  status: StatusMapa;
  paciente: string;
  local: string;
};

export const FILTROS_INICIAIS: FiltrosMapa = {
  periodo: 'todas',
  status: 'ativas',
  paciente: '',
  local: '',
};

export type ConsultaFiltravel = {
  data: string;
  status?: string;
  local: string;
  medico?: string;
  pacienteNome?: string;
};

type Props = {
  filtros: FiltrosMapa;
  onChange: (filtros: FiltrosMapa) => void;
  perfil: 'medico' | 'paciente';
  total: number;
  exibidas: number;
};

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function interpretarData(
  texto: string
): Date | null {
  const partes =
    /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);

  if (!partes) return null;

  const dia = Number(partes[1]);
  const mes = Number(partes[2]);
  const ano = Number(partes[3]);

  const data = new Date(ano, mes - 1, dia);

  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    return null;
  }

  return data;
}

function inicioDoDia(data: Date): Date {
  return new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate()
  );
}

export function filtrarConsultasMapa<
  T extends ConsultaFiltravel
>(
  consultas: T[],
  filtros: FiltrosMapa,
  perfil: 'medico' | 'paciente'
): T[] {
  const hoje = inicioDoDia(new Date());

  const buscaPessoa = normalizar(filtros.paciente);
  const buscaLocal = normalizar(filtros.local);

  return consultas.filter((consulta) => {
    const status =
      consulta.status ?? 'registro_pessoal';

    // STATUS
    if (
      filtros.status === 'ativas' &&
      (status === 'cancelada' ||
        status === 'recusada')
    ) {
      return false;
    }

    if (
      filtros.status !== 'ativas' &&
      filtros.status !== 'todas' &&
      status !== filtros.status
    ) {
      return false;
    }

    // PERÍODO
    if (filtros.periodo !== 'todas') {
      const data = interpretarData(consulta.data);

      if (!data) return false;

      const diferencaDias = Math.round(
        (inicioDoDia(data).getTime() -
          hoje.getTime()) /
          86400000
      );

      if (
        filtros.periodo === 'hoje' &&
        diferencaDias !== 0
      ) {
        return false;
      }

      if (
        filtros.periodo === 'amanha' &&
        diferencaDias !== 1
      ) {
        return false;
      }

      if (
        filtros.periodo === '7dias' &&
        (diferencaDias < 0 ||
          diferencaDias > 6)
      ) {
        return false;
      }
    }

    // PACIENTE OU MÉDICO
    if (buscaPessoa) {
      const nome =
        perfil === 'medico'
          ? consulta.pacienteNome ?? ''
          : consulta.medico ?? '';

      if (!normalizar(nome).includes(buscaPessoa)) {
        return false;
      }
    }

    // ENDEREÇO OU ESTABELECIMENTO
    if (
      buscaLocal &&
      !normalizar(consulta.local).includes(
        buscaLocal
      )
    ) {
      return false;
    }

    return true;
  });
}

type Opcao<T extends string> = {
  valor: T;
  titulo: string;
};

function BotaoOpcao<T extends string>({
  valor,
  titulo,
  selecionado,
  onPress,
}: {
  valor: T;
  titulo: string;
  selecionado: boolean;
  onPress: (valor: T) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(valor)}
      style={[
        styles.opcao,
        selecionado && styles.opcaoAtiva,
      ]}
    >
      <Text
        style={[
          styles.opcaoTexto,
          selecionado && styles.opcaoTextoAtivo,
        ]}
      >
        {titulo}
      </Text>
    </Pressable>
  );
}

export default function FiltrosMapaConsultas({
  filtros,
  onChange,
  perfil,
  total,
  exibidas,
}: Props) {
  const periodos: Opcao<PeriodoMapa>[] = [
    { valor: 'todas', titulo: 'Todas' },
    { valor: 'hoje', titulo: 'Hoje' },
    { valor: 'amanha', titulo: 'Amanhã' },
    { valor: '7dias', titulo: '7 dias' },
  ];

  const status: Opcao<StatusMapa>[] = [
    { valor: 'ativas', titulo: 'Ativas' },
    { valor: 'todas', titulo: 'Todas' },
    { valor: 'confirmada', titulo: 'Confirmadas' },
    {
      valor: 'aguardando_confirmacao',
      titulo: 'Aguardando',
    },
    { valor: 'recusada', titulo: 'Recusadas' },
    { valor: 'cancelada', titulo: 'Canceladas' },
    {
      valor: 'registro_pessoal',
      titulo: 'Pessoais',
    },
  ];

  function atualizar<K extends keyof FiltrosMapa>(
    campo: K,
    valor: FiltrosMapa[K]
  ) {
    onChange({
      ...filtros,
      [campo]: valor,
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <View style={styles.tituloLinha}>
          <Ionicons
            name="options-outline"
            size={21}
            color="#0E766D"
          />

          <Text style={styles.titulo}>
            Filtrar consultas
          </Text>
        </View>

        <Pressable
          onPress={() =>
            onChange({ ...FILTROS_INICIAIS })
          }
        >
          <Text style={styles.limpar}>
            Limpar
          </Text>
        </Pressable>
      </View>

      <Text style={styles.rotulo}>Período</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.opcoes}
      >
        {periodos.map((opcao) => (
          <BotaoOpcao
            key={opcao.valor}
            {...opcao}
            selecionado={
              filtros.periodo === opcao.valor
            }
            onPress={(valor) =>
              atualizar('periodo', valor)
            }
          />
        ))}
      </ScrollView>

      <Text style={styles.rotulo}>Status</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.opcoes}
      >
        {status.map((opcao) => (
          <BotaoOpcao
            key={opcao.valor}
            {...opcao}
            selecionado={
              filtros.status === opcao.valor
            }
            onPress={(valor) =>
              atualizar('status', valor)
            }
          />
        ))}
      </ScrollView>

      <Text style={styles.rotulo}>
        {perfil === 'medico'
          ? 'Buscar paciente'
          : 'Buscar médico'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder={
          perfil === 'medico'
            ? 'Nome do paciente'
            : 'Nome do médico'
        }
        placeholderTextColor="#8A9A96"
        value={filtros.paciente}
        onChangeText={(texto) =>
          atualizar('paciente', texto)
        }
      />

      <Text style={styles.rotulo}>
        Buscar local
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Hospital, clínica ou endereço"
        placeholderTextColor="#8A9A96"
        value={filtros.local}
        onChangeText={(texto) =>
          atualizar('local', texto)
        }
      />

      <View style={styles.resultado}>
        <Ionicons
          name="map-outline"
          size={17}
          color="#0E766D"
        />

        <Text style={styles.resultadoTexto}>
          {exibidas} de {total} consultas
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0EAE8',
    backgroundColor: '#FFFFFF',
    gap: 10,
    marginBottom: 14,
  },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tituloLinha: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  titulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333E3C',
  },
  limpar: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0E766D',
  },
  rotulo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333E3C',
  },
  opcoes: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 3,
  },
  opcao: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EEF2F1',
  },
  opcaoAtiva: {
    backgroundColor: '#0E766D',
  },
  opcaoTexto: {
    color: '#52615E',
    fontSize: 12,
    fontWeight: '600',
  },
  opcaoTextoAtivo: {
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0EAE8',
    borderRadius: 10,
    padding: 12,
    color: '#333E3C',
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  resultado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingTop: 5,
  },
  resultadoTexto: {
    color: '#0E766D',
    fontSize: 13,
    fontWeight: '700',
  },
});
