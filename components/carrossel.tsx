import React from "react";
import {
  FlatList,
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Item = {
  id: string;
  titulo: string;
  descricao: string;
  imagem: ImageSourcePropType;
};

const ITENS: Item[] = [
  {
    id: "1",
    titulo: "Acompanhe sua glicemia",
    descricao:
      "Meça conforme a orientação do seu profissional da saúde e registre os resultados.",
    imagem: require("../assets/images/carrossel/glicemia.png"),
  },
  {
    id: "2",
    titulo: "Pressão arterial",
    descricao:
      "Registre suas medições de pressão arterial e leve seu histórico às consultas.",
    imagem: require("../assets/images/carrossel/pressao.png"),
  },
  {
    id: "3",
    titulo: "Alimentação",
    descricao:
      "Inclua frutas, verduras e legumes nas refeições e valorize os alimentos in natura.",
    imagem: require("../assets/images/carrossel/alimentacao.png"),
  },
  {
    id: "4",
    titulo: "Atividade física",
    descricao:
      "Escolha uma atividade que você goste. Respeite seus limites e comece aos poucos.",
    imagem: require("../assets/images/carrossel/atividade.png"),
  },
  {
    id: "5",
    titulo: "Consultas",
    descricao: "Não esqueça de registrar no app :)",
    imagem: require("../assets/images/carrossel/consulta.png"),
  },
];

export default function Carrossel() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Dicas de saúde</Text>

      <FlatList
        data={ITENS}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.lista}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        renderItem={({ item }) => (
          <View style={styles.cartao}>
            <Image
              source={item.imagem}
              style={styles.imagem}
              resizeMode="cover"
            />

            <Text style={styles.cartaoTitulo} numberOfLines={5}>
              {item.titulo}
            </Text>

            <Text style={styles.descricao} numberOfLines={10}>
              {item.descricao}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },

  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginBottom: 12,
  },

  lista: { paddingHorizontal: 5 },

  cartao: {
    width: 350,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    marginHorizontal: 16,
  },
  imagem: {
    width: 350,
    height: 170,
  },

  cartaoTitulo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#242D3C",
    marginTop: 7,
    marginBottom: 2,
    marginLeft: 10,
  },

  descricao: {
    fontSize: 14,
    lineHeight: 19,
    color: "#737B8C",
    marginTop: 0,
    marginBottom: 10,
    marginLeft: 10,
  },
});
