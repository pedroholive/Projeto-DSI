import React from "react";
import {
  FlatList,
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Item = { id: string; titulo: string; imagem: ImageSourcePropType };

const ITENS: Item[] = [
  {
    id: "1",
    titulo: "Controle da glicemia: Como e quando medir?",
    imagem: require("../assets/images/carrossel/glicemia.png"),
  },
  {
    id: "2",
    titulo: "Pressão arterial: Menos sal, mais saúde!",
    imagem: require("../assets/images/carrossel/pressao.png"),
  },
  {
    id: "3",
    titulo: "Alimentação: A nutrição vem da terra.",
    imagem: require("../assets/images/carrossel/alimentacao.png"),
  },
  {
    id: "4",
    titulo:
      "Atividade física: OMS recomenda entre 150 a 300 minutos por semana.",
    imagem: require("../assets/images/carrossel/atividade.png"),
  },
  {
    id: "5",
    titulo: "Consultas: Não esqueça de confirmar!",
    imagem: require("../assets/images/carrossel/consulta.png"),
  },
];

export default function Carrossel() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Continue cuidando da sua saúde</Text>
      <FlatList
        data={ITENS}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.lista}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        renderItem={({ item }) => (
          <View style={styles.cartao}>
            <Image source={item.imagem} style={styles.imagem} />
            <Text style={styles.cartaoTitulo} numberOfLines={5}>
              {item.titulo}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 16 },
  titulo: {
    fontSize: 18,
    fontWeight: "600",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  lista: { paddingHorizontal: 16 },
  cartao: { width: 160 },
  imagem: {
    width: 160,
    height: 110,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
  },
  cartaoTitulo: { marginTop: 8, fontSize: 14 },
});
