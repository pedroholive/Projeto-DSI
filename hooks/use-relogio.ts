import { useEffect, useState } from "react";
import { AppState } from "react-native";

// Devolve a data/hora atual, atualizada a cada 30 segundos e sempre que o
// app volta para o primeiro plano.
export function useRelogio(): Date {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const atualizar = () => setAgora(new Date());
    const timer = setInterval(atualizar, 30000);
    const listener = AppState.addEventListener("change", (estado) => {
      if (estado === "active") atualizar();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, []);
  return agora;
}
