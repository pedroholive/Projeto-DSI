
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import MapaAjuste from './mapa-ajuste';

export type CoordenadasConsulta = {
  latitude: number;
  longitude: number;
};

type Props = {
  latitude: number;
  longitude: number;
  onSalvar: (
    coordenadas: CoordenadasConsulta
  ) => Promise<void>;
  onCancelar: () => void;
};

function coordenadasValidas(
  ponto: CoordenadasConsulta
): boolean {
  return (
    Number.isFinite(ponto.latitude) &&
    Number.isFinite(ponto.longitude) &&
    ponto.latitude >= -90 &&
    ponto.latitude <= 90 &&
    ponto.longitude >= -180 &&
    ponto.longitude <= 180 &&
    !(ponto.latitude === 0 && ponto.longitude === 0)
  );
}

export default function AjusteLocalizacaoConsulta({
  latitude,
  longitude,
  onSalvar,
  onCancelar,
}: Props) {
  const [ponto, setPonto] =
    useState<CoordenadasConsulta>({
      latitude,
      longitude,
    });

  // Ao incrementar, recria o mapa em sua posição inicial.
  const [versaoMapa, setVersaoMapa] = useState(0);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const alterado =
    ponto.latitude !== latitude ||
    ponto.longitude !== longitude;

  function restaurarPosicaoSalva() {
    if (salvando) return;

    setPonto({
      latitude,
      longitude,
    });

    setErro('');
    setVersaoMapa((atual) => atual + 1);
  }

  async function confirmar() {
    if (salvando) return;

    if (!coordenadasValidas(ponto)) {
      setErro('Selecione uma localização válida.');
      return;
    }

    if (!alterado) {
      setErro(
        'Mova o marcador antes de confirmar.'
      );
      return;
    }

    setSalvando(true);
    setErro('');

    try {
      await onSalvar(ponto);
    } catch (error) {
      console.error(
        'Erro ao salvar localização:',
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar a localização.'
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <Ionicons
          name="location-outline"
          size={21}
          color="#0E766D"
        />

        <Text style={styles.titulo}>
          Ajustar localização da consulta
        </Text>
      </View>

      <Text style={styles.descricao}>
        Arraste o marcador ou toque no mapa para
        indicar a entrada correta do local de atendimento.
      </Text>

      <MapaAjuste
        key={versaoMapa}
        coordenadas={ponto}
        onChange={(
          novasCoordenadas: CoordenadasConsulta
        ) => {
          if (salvando) return;

          setPonto(novasCoordenadas);
          setErro('');
        }}
      />

      <View style={styles.aviso}>
        <Ionicons
          name="information-circle-outline"
          size={18}
          color="#0E766D"
        />

        <Text style={styles.avisoTexto}>
          O endereço escrito será preservado.
          Apenas a posição do marcador será atualizada.
        </Text>
      </View>

      {alterado ? (
        <View style={styles.status}>
          <Ionicons
            name="ellipse"
            size={10}
            color="#B7791F"
          />

          <Text style={styles.statusTexto}>
            Alteração ainda não salva
          </Text>
        </View>
      ) : (
        <View style={styles.status}>
          <Ionicons
            name="checkmark-circle-outline"
            size={17}
            color="#0E766D"
          />

          <Text style={styles.statusSalvo}>
            Marcador na posição salva
          </Text>
        </View>
      )}

      <Pressable
        style={[
          styles.restaurar,
          (!alterado || salvando) &&
            styles.desabilitado,
        ]}
        onPress={restaurarPosicaoSalva}
        disabled={!alterado || salvando}
      >
        <Ionicons
          name="refresh-outline"
          size={18}
          color="#0E766D"
        />

        <Text style={styles.restaurarTexto}>
          Voltar à posição salva
        </Text>
      </Pressable>

      {!!erro && (
        <Text style={styles.erro}>
          {erro}
        </Text>
      )}

      <View style={styles.acoes}>
        <Pressable
          style={styles.cancelar}
          onPress={onCancelar}
          disabled={salvando}
        >
          <Text style={styles.cancelarTexto}>
            Cancelar
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.confirmar,
            (!alterado || salvando) &&
              styles.desabilitado,
          ]}
          onPress={() => void confirmar()}
          disabled={!alterado || salvando}
        >
          {salvando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color="#FFFFFF"
              />

              <Text style={styles.confirmarTexto}>
                Confirmar localização
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0EAE8',
    marginTop: 12,
    gap: 12,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  titulo: {
    flex: 1,
    color: '#273331',
    fontSize: 16,
    fontWeight: '700',
  },
  descricao: {
    fontSize: 13,
    lineHeight: 20,
    color: '#52615E',
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#E7F8F4',
    borderRadius: 10,
    padding: 12,
  },
  avisoTexto: {
    flex: 1,
    color: '#52615E',
    fontSize: 12,
    lineHeight: 18,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusTexto: {
    fontSize: 12,
    color: '#B7791F',
    fontWeight: '700',
  },
  statusSalvo: {
    fontSize: 12,
    color: '#0E766D',
    fontWeight: '700',
  },
  restaurar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E7F8F4',
    borderWidth: 1,
    borderColor: '#B6DCD3',
    padding: 12,
    borderRadius: 10,
  },
  restaurarTexto: {
    color: '#0E766D',
    fontWeight: '700',
    fontSize: 13,
  },
  erro: {
    color: '#D94B57',
    fontSize: 12,
  },
  acoes: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelar: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D2DEDB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelarTexto: {
    color: '#52615E',
    fontWeight: '700',
    fontSize: 13,
  },
  confirmar: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#0E766D',
    padding: 14,
    borderRadius: 10,
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmarTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  desabilitado: {
    opacity: 0.5,
  },
});
