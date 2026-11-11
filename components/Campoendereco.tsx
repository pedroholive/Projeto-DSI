import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import {
  buscarSugestoesEndereco,
  type SugestaoEndereco,
} from '@/services/Enderecoservice';

interface Props {
  value: string;
  onChangeText: (texto: string) => void;
  // Chamado com a sugestão escolhida, ou com null quando o usuário volta a digitar
  onSelecionar: (sugestao: SugestaoEndereco | null) => void;
  placeholder?: string;
  maxLength?: number;
  containerStyle?: StyleProp<ViewStyle>; // caixa em volta do campo (opcional)
  inputStyle?: StyleProp<TextStyle>;
  icone?: boolean; // mostra o ícone de local dentro da caixa
}

export default function CampoEndereco({
  value,
  onChangeText,
  onSelecionar,
  placeholder,
  maxLength = 100,
  containerStyle,
  inputStyle,
  icone = false,
}: Props) {
  const [sugestoes, setSugestoes] = useState<SugestaoEndereco[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [semResultado, setSemResultado] = useState(false);

  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controle = useRef<AbortController | null>(null);

  function cancelarBusca() {
    if (temporizador.current) clearTimeout(temporizador.current);
    controle.current?.abort();
    temporizador.current = null;
    controle.current = null;
  }

  useEffect(() => cancelarBusca, []);

  function aoDigitar(texto: string) {
    onChangeText(texto);
    onSelecionar(null);
    cancelarBusca();
    setSemResultado(false);

    if (texto.trim().length < 3) {
      setSugestoes([]);
      setBuscando(false);
      return;
    }

    setBuscando(true);
    temporizador.current = setTimeout(async () => {
      const ctrl = new AbortController();
      controle.current = ctrl;
      try {
        const lista = await buscarSugestoesEndereco(texto, ctrl.signal);
        if (ctrl.signal.aborted) return;
        setSugestoes(lista);
        setSemResultado(lista.length === 0);
      } catch {
        if (!ctrl.signal.aborted) {
          setSugestoes([]);
          setSemResultado(false); // falha de rede: segue com texto livre
        }
      } finally {
        if (!ctrl.signal.aborted) setBuscando(false);
      }
    }, 450);
  }

  function escolher(s: SugestaoEndereco) {
    cancelarBusca();
    setSugestoes([]);
    setSemResultado(false);
    setBuscando(false);
    onChangeText(s.textoCompleto.slice(0, maxLength));
    onSelecionar(s);
  }

  const campo = (
    <>
      {icone && (
        <Ionicons
          name="location-outline"
          size={19}
          color="#7E8D89"
          style={styles.icone}
        />
      )}
      <TextInput
        style={[inputStyle, icone && { flex: 1 }]}
        placeholder={placeholder}
        placeholderTextColor="#A7B2AF"
        value={value}
        onChangeText={aoDigitar}
        maxLength={maxLength}
        autoCorrect={false}
      />
      {buscando && (
        <ActivityIndicator size="small" color="#0E766D" style={styles.carregando} />
      )}
    </>
  );

  return (
    <View>
      {containerStyle ? (
        <View style={containerStyle}>{campo}</View>
      ) : (
        <View style={styles.linha}>{campo}</View>
      )}

      {sugestoes.length > 0 && (
        <View style={styles.lista}>
          <Text style={styles.cabecalho}>Selecione o local correto</Text>
          {sugestoes.map((s) => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressionado]}
              onPress={() => escolher(s)}
              accessibilityRole="button"
              accessibilityLabel={`Usar ${s.textoCompleto}`}
            >
              <Ionicons name="location" size={18} color="#0E766D" />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitulo} numberOfLines={1}>
                  {s.titulo}
                </Text>
                {!!s.subtitulo && (
                  <Text style={styles.itemSubtitulo} numberOfLines={2}>
                    {s.subtitulo}
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
          <Text style={styles.creditos}>© colaboradores do OpenStreetMap</Text>
        </View>
      )}

      {semResultado && (
        <Text style={styles.aviso}>
          Nenhum endereço encontrado. O texto será salvo, mas o mapa pode não aparecer.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center' },
  icone: { marginLeft: 13 },
  carregando: { marginRight: 12 },
  lista: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0EAE8',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  cabecalho: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7E8D89',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F3',
  },
  itemPressionado: { backgroundColor: '#E7F8F4' },
  itemTitulo: { fontSize: 14, fontWeight: '600', color: '#273331' },
  itemSubtitulo: { fontSize: 12, color: '#7E8D89', marginTop: 2 },
  creditos: {
    fontSize: 10,
    color: '#A7B2AF',
    textAlign: 'right',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  aviso: { fontSize: 12, color: '#7E8D89', marginTop: 6 },
});