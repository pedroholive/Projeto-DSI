import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

const C = {
  card: '#FFFFFF',
  primary: '#0E9F8C',
  primaryDark: '#0E766D',
  primarySoft: '#E7F8F4',
  text: '#273331',
  muted: '#7E8D89',
  border: '#E0EAE8',
  fundoResumo: '#F4F8F7',
};

export type TipoFeedbackConsulta = 'registrada' | 'atualizada' | 'excluida';

export type ResumoConsulta = {
  especialidade: string;
  medico?: string;
  data: string;
  horario: string;
  local?: string;
};

const TEXTOS: Record<
  TipoFeedbackConsulta,
  { titulo: string; descricao: string }
> = {
  registrada: {
    titulo: 'Consulta registrada!',
    descricao: 'Ela já aparece na sua lista de consultas.',
  },
  atualizada: {
    titulo: 'Consulta atualizada!',
    descricao: 'As alterações foram salvas.',
  },
  excluida: {
    titulo: 'Consulta excluída!',
    descricao: 'Ela foi removida da sua lista.',
  },
};

type Props = {
  visible: boolean;
  tipo: TipoFeedbackConsulta;
  consulta?: ResumoConsulta | null;
  // Botão principal (fecha o pop-up e normalmente volta para a lista)
  onConcluir: () => void;
  textoConcluir?: string;
  // Botão secundário opcional, por exemplo "Registrar outra"
  onSecundario?: () => void;
  textoSecundario?: string;
};

export default function ModalConsultaFeedback({
  visible,
  tipo,
  consulta,
  onConcluir,
  textoConcluir = 'Ver minhas consultas',
  onSecundario,
  textoSecundario = 'Registrar outra',
}: Props) {
  const textos = TEXTOS[tipo];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onConcluir}
    >
      <View style={styles.fundo}>
        <View style={styles.conteudo}>
          <View style={styles.icone}>
            <Ionicons
              name="checkmark-circle-outline"
              size={40}
              color={C.primaryDark}
            />
          </View>

          <Text style={styles.titulo}>{textos.titulo}</Text>
          <Text style={styles.descricao}>{textos.descricao}</Text>

          {tipo !== 'excluida' && !!consulta && (
            <View style={styles.resumo}>
              <Text style={styles.resumoTitulo}>
                {consulta.especialidade}
              </Text>

              {!!consulta.medico && (
                <Text style={styles.resumoMedico}>{consulta.medico}</Text>
              )}

              <View style={styles.resumoLinha}>
                <Ionicons name="time-outline" size={15} color={C.muted} />
                <Text style={styles.resumoTexto}>
                  {consulta.data} • {consulta.horario}
                </Text>
              </View>

              {!!consulta.local && (
                <View style={styles.resumoLinha}>
                  <Ionicons
                    name="location-outline"
                    size={15}
                    color={C.muted}
                  />
                  <Text style={styles.resumoTexto} numberOfLines={2}>
                    {consulta.local}
                  </Text>
                </View>
              )}
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.botaoPrincipal,
              pressed && { opacity: 0.85 },
            ]}
            onPress={onConcluir}
          >
            <Text style={styles.botaoPrincipalTexto}>{textoConcluir}</Text>
          </Pressable>

          {onSecundario && (
            <Pressable
              style={({ pressed }) => [
                styles.botaoSecundario,
                pressed && { opacity: 0.7 },
              ]}
              onPress={onSecundario}
            >
              <Text style={styles.botaoSecundarioTexto}>
                {textoSecundario}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(15, 42, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  conteudo: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
  },

  icone: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  titulo: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    marginBottom: 6,
    textAlign: 'center',
  },

  descricao: {
    fontSize: 14,
    lineHeight: 20,
    color: C.muted,
    textAlign: 'center',
    marginBottom: 18,
  },

  resumo: {
    width: '100%',
    backgroundColor: C.fundoResumo,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 6,
    marginBottom: 20,
  },

  resumoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },

  resumoMedico: {
    fontSize: 13,
    color: C.muted,
    marginBottom: 2,
  },

  resumoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  resumoTexto: {
    flex: 1,
    fontSize: 13,
    color: C.text,
  },

  botaoPrincipal: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    backgroundColor: C.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  botaoPrincipalTexto: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  botaoSecundario: {
    width: '100%',
    height: 46,
    marginTop: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  botaoSecundarioTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: C.primaryDark,
  },
});