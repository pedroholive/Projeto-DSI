import React, { useState } from "react";
import {
  ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
} from "react-native";
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';

const C = {
  bg: "#dde8e6", white: "#fff", teal: "#3d8b85",
  dark: "#1a3d3a", gray: "#7a9a97", border: "#c8dedd",
  light: "#e8f2f1", error: "#c0392b", success: "#2e8b57",
};

type Profile = "patient" | "professional";
type Form = {
  name: string; dob: string; email: string; phone: string;
  emergency: string; password: string; confirm: string;
  specialty: string; crm: string;
};

const initial: Form = {
  name: "", dob: "", email: "", phone: "", emergency: "",
  password: "", confirm: "", specialty: "", crm: "",
};

const diabetes = [
  "Diabetes Tipo 1", "Diabetes Tipo 2", "Diabetes Gestacional",
  "Pré-diabetes", "Não sei informar",
];

const pressure = [
  "Hipertensão Essencial / Primária",
  "Hipertensão Gestacional",
  "Pré-hipertensão / Em observação",
  "Não sei informar",
];

const phoneMask = (v: string) => {
  const n = v.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return n ? `(${n}` : "";
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
};

const dateMask = (v: string) => {
  const n = v.replace(/\D/g, "").slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
};

const validBirthDate = (value: string) => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;

  const [day, month, year] = value.split("/").map(Number);

  if (year < 1900 || month < 1 || month > 12 || day < 1) return false;

  const daysInMonth = new Date(year, month, 0).getDate();

  return day <= daysInMonth;
};

export default function App() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Form>(initial);
  const [conditions, setConditions] = useState<string[]>([]);
  const [types, setTypes] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [screen, setScreen] = useState<"choose" | "form" | "success">("choose");
  const [error, setError] = useState("");

  const set = (key: keyof Form, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const emailOK = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(form.email);
  const specialtyOK = /^[A-Za-zÀ-ÿ\s]{3,}$/.test(form.specialty); // NOVO
  const crmOK = /^\d{4,7}$/.test(form.crm); // NOVO
  const passwordOK =
    form.password.length >= 6 &&
    /[A-Z]/.test(form.password) &&
    /[a-z]/.test(form.password) &&
    /\d/.test(form.password) &&
    /[^A-Za-z0-9]/.test(form.password);

  const submit = async () => {
    setError("");

    const fields = profile === "patient"
      ? [form.name, form.dob, form.email, form.phone, form.emergency,
         form.password, form.confirm]
      : [form.name, form.dob, form.email, form.phone, form.specialty,
         form.crm, form.password, form.confirm];

    if (fields.some(v => !v.trim()))
      return setError("Preencha todos os campos.");

    if (!emailOK)
      return setError("Digite um e-mail com domínio válido.");

    if (profile === "professional" && !specialtyOK) // NOVO
      return setError("Digite uma especialidade válida (só letras, mínimo 3 caracteres)."); // NOVO

    if (profile === "professional" && !crmOK) // NOVO
      return setError("Digite um CRM válido (apenas números, 4 a 7 dígitos)."); // NOVO

    if (!validBirthDate(form.dob))
      return setError("Digite uma data de nascimento válida, a partir de 01/01/1900.");

    if (!passwordOK)
      return setError(
        "A senha precisa ter 6+ caracteres, maiúscula, minúscula, número e caractere especial."
      );

    if (form.password !== form.confirm)
      return setError("As senhas precisam ser iguais.");

    if (!agreed)
      return setError("Aceite os Termos de Uso e a Política de Privacidade.");

    if (profile === "patient") {
      if (conditions.length === 0)
        return setError("Selecione uma condição.");

      if (conditions.includes("Diabetes") && !types["Diabetes"])
        return setError("Selecione uma opção para a condição escolhida.");

      if (conditions.includes("Hipertensão") && !types["Hipertensão"])
        return setError("Selecione uma opção para a condição escolhida.");
    }

    try {
      await createUserWithEmailAndPassword(auth, form.email, form.password);
      setScreen("success");
    } catch (err: any) {
      setError("Não foi possível criar a conta. Verifique seus dados e tente de novo.");
    }
  };

  const reset = () => {
    setProfile(null);
    setForm(initial);
    setConditions([]);
    setTypes({});
    setAgreed(false);
    setError("");
    setScreen("choose");
  };

  if (screen === "success")
    return (
      <Page>
        <Header text="Sua conta foi criada com sucesso!" />
        <View style={s.success}>
          <Text style={s.successIcon}>✓</Text>
          <Text style={s.successTitle}>Conta criada!</Text>
          <Text style={s.successText}>
            Bem-vindo ao Health Sync!{"\n"}Seu perfil está pronto.
          </Text>
          <Button text="Ir para o início" onPress={() => router.replace('/login')} />
        </View>
      </Page>
    );

  if (screen === "choose")
    return (
      <Page>
        <Header text="Como você vai usar o aplicativo?" />

        <ChoiceCard
          title="Sou Paciente"
          text="Acompanhe sua saúde, consultas e histórico médico."
          active={profile === "patient"}
          onPress={() => setProfile("patient")}
        />

        <ChoiceCard
          title="Sou Profissional de Saúde"
          text="Gerencie pacientes, agenda e prontuários."
          active={profile === "professional"}
          onPress={() => setProfile("professional")}
        />

        <Button
          text="Continuar"
          disabled={!profile}
          onPress={() => setScreen("form")}
        />
      </Page>
    );

  return (
    <Page>
      <Header text="Crie sua conta e comece seu monitoramento contínuo de saúde." />

      <TouchableOpacity onPress={() => setScreen("choose")}>
        <Text style={s.back}>‹ Voltar</Text>
      </TouchableOpacity>

      <Field label="Nome completo">
        <Input
          value={form.name}
          placeholder="Digite seu nome"
          onChange={(v: string) => set("name", v)}
        />
      </Field>

      <Field label="Data de nascimento">
        <Input
          value={form.dob}
          placeholder="dd/mm/aaaa"
          keyboard="numeric"
          onChange={(v: string) => set("dob", dateMask(v))}
        />
      </Field>

      {profile === "professional" && (
        <>
          <Field label="Especialidade">
            <Input
              value={form.specialty}
              placeholder="Sua especialidade"
              onChange={(v: string) => set("specialty", v)}
            />
          </Field>

          <Field label="CRM">
            <Input
              value={form.crm}
              placeholder="Número do CRM"
              keyboard="numeric"
              onChange={(v: string) => set("crm", v)}
            />
          </Field>
        </>
      )}

      <Field label="E-mail">
        <Input
          value={form.email}
          placeholder="seuemail@gmail.com"
          keyboard="email-address"
          onChange={(v: string) => set("email", v)}
        />
        {form.email.length > 0 && !emailOK &&
          <Text style={s.fieldError}>Digite um e-mail válido.</Text>}
      </Field>

      {profile === "patient" && (
        <Field label="Condição que deseja acompanhar">
          <View style={s.box}>
            {["Diabetes", "Hipertensão", "Nenhuma"].map((item: string) => (
              <React.Fragment key={item}>
                <TouchableOpacity
                  style={s.row}
                  onPress={() => {
                    if (item === "Nenhuma") {
                      setConditions(["Nenhuma"]);
                      setTypes({});
                      return;
                    }

                    setConditions(prev => {
                      const current = prev.filter(v => v !== "Nenhuma");

                      if (current.includes(item)) {
                        setTypes(prevTypes => {
                          const next = { ...prevTypes };
                          delete next[item];
                          return next;
                        });
                        return current.filter(v => v !== item);
                      }

                      return [...current, item];
                    });
                  }}
                >
                  <View style={[s.check, conditions.includes(item) && s.checked]}>
                    {conditions.includes(item) && <Text style={s.tick}>✓</Text>}
                  </View>
                  <Text style={s.condition}>
                    {item === "Nenhuma"
                      ? "Nenhuma, apenas prevenção"
                      : item}
                  </Text>
                </TouchableOpacity>

                {conditions.includes(item) && item !== "Nenhuma" && (
                  <View style={s.options}>
                    {(item === "Diabetes" ? diabetes : pressure).map(
                      (v: string) => (
                        <TouchableOpacity
                          key={v}
                          style={s.option}
                          onPress={() => setTypes(prev => ({ ...prev, [item]: v }))}
                        >
                          <View style={[s.smallRadio, types[item] === v && s.radioActive]}>
                            {types[item] === v && <View style={s.dot} />}
                          </View>
                          <Text style={s.optionText}>{v}</Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>
        </Field>
      )}

      <Field label="Telefone">
        <Input
          value={form.phone}
          placeholder="(00) 90000-0000"
          keyboard="phone-pad"
          onChange={(v: string) => set("phone", phoneMask(v))}
        />
      </Field>

      {profile === "patient" && (
        <Field label="Telefone de emergência">
          <Input
            value={form.emergency}
            placeholder="(00) 90000-0000"
            keyboard="phone-pad"
            onChange={(v: string) => set("emergency", phoneMask(v))}
          />
        </Field>
      )}

      <Field label="Senha">
        <Password
          value={form.password}
          show={showPass}
          toggle={() => setShowPass(!showPass)}
          onChange={(v: string) => set("password", v)}
        />

        <View style={s.rules}>
          <Rule ok={form.password.length >= 6} text="6 caracteres ou mais" />
          <Rule ok={/[A-Z]/.test(form.password)} text="Letra maiúscula" />
          <Rule ok={/[a-z]/.test(form.password)} text="Letra minúscula" />
          <Rule ok={/\d/.test(form.password)} text="Número" />
          <Rule ok={/[^A-Za-z0-9]/.test(form.password)} text="Caractere especial" />
        </View>
      </Field>

      <Field label="Confirmar senha">
        <Password
          value={form.confirm}
          show={showConfirm}
          toggle={() => setShowConfirm(!showConfirm)}
          onChange={(v: string) => set("confirm", v)}
        />
      </Field>

      <TouchableOpacity style={s.terms} onPress={() => setAgreed(!agreed)}>
        <View style={[s.check, agreed && s.checked]}>
          {agreed && <Text style={s.tick}>✓</Text>}
        </View>
        <Text style={s.termsText}>
          Li e concordo com os <Text style={s.link}>Termos de Uso</Text> e a{" "}
          <Text style={s.link}>Política de Privacidade</Text>.
        </Text>
      </TouchableOpacity>

      {error !== "" && <Text style={s.error}>{error}</Text>}

      <Button text="Criar conta" onPress={submit} />

      <Text style={s.footer}>
        Já tem conta? <Text style={s.link}>Entrar</Text>
      </Text>
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={s.bg} contentContainerStyle={s.page}>
      {children}
    </ScrollView>
  );
}

function Header({ text }: { text: string }) {
  return (
    <View style={s.header}>
      <View style={s.logo}>
        <Image
          source={require('../assets/images/logo-healthsync.png')}
          style={{ width: 36, height: 36 }}
          resizeMode="contain"
        />
      </View>
      <Text style={s.title}>Health Sync</Text>
      <Text style={s.subtitle}>{text}</Text>
    </View>
  );
}

function ChoiceCard({
  title, text, active, onPress,
}: {
  title: string; text: string; active: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.card, active && s.cardActive]}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={[s.cardTitle, active && { color: C.white }]}>{title}</Text>
        <Text style={[s.cardText, active && { color: "#d9eeee" }]}>{text}</Text>
      </View>
      <View style={[s.radio, active && s.radioActive]}>
        {active && <View style={s.dot} />}
      </View>
    </TouchableOpacity>
  );
}

function Field({
  label, children,
}: {
  label: string; children: React.ReactNode;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

function Input({
  value, placeholder, keyboard, onChange,
}: {
  value: string;
  placeholder: string;
  keyboard?: "numeric" | "phone-pad" | "email-address";
  onChange: (v: string) => void;
}) {
  return (
    <TextInput
      style={s.input}
      value={value}
      placeholder={placeholder}
      placeholderTextColor="#9bb3b1"
      keyboardType={keyboard}
      autoCapitalize="none"
      onChangeText={onChange}
    />
  );
}

function Password({
  value, show, toggle, onChange,
}: {
  value: string;
  show: boolean;
  toggle: () => void;
  onChange: (v: string) => void;
}) {
  return (
    <View>
      <TextInput
        style={s.input}
        value={value}
        placeholder="••••••••"
        placeholderTextColor="#9bb3b1"
        secureTextEntry={!show}
        autoCapitalize="none"
        onChangeText={onChange}
      />
      <TouchableOpacity style={s.toggle} onPress={toggle}>
        <Text style={s.toggleText}>{show ? "Ocultar" : "Mostrar"}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <Text style={[s.rule, ok && { color: C.success }]}>
      {ok ? "✓" : "○"} {text}
    </Text>
  );
}

function Button({
  text, onPress, disabled = false,
}: {
  text: string; onPress: () => void; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[s.button, disabled && s.disabled]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={s.buttonText}>{text}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  bg: { backgroundColor: C.bg },
  page: { padding: 20, paddingTop: 40, paddingBottom: 60 },

  header: { alignItems: "center", marginBottom: 25, gap: 7 },
  logo: {
    width: 55, height: 55, borderRadius: 16, backgroundColor: C.teal,
    alignItems: "center", justifyContent: "center",
  },
  logoText: { color: C.white, fontSize: 30, fontWeight: "bold" },
  title: { fontSize: 22, fontWeight: "bold", color: C.dark },
  subtitle: { color: C.gray, fontSize: 13, textAlign: "center" },

  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.white, padding: 15, borderRadius: 16,
    borderWidth: 1.5, borderColor: C.border, marginBottom: 12,
  },
  cardActive: { backgroundColor: C.teal, borderColor: C.teal },
  cardTitle: { color: C.dark, fontWeight: "600", fontSize: 14 },
  cardText: { color: C.gray, fontSize: 12, marginTop: 2 },

  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: C.border, alignItems: "center", justifyContent: "center",
  },
  radioActive: { borderColor: C.teal, backgroundColor: C.white },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.teal },

  button: {
    backgroundColor: C.teal, padding: 15, borderRadius: 28,
    alignItems: "center", marginTop: 7,
  },
  disabled: { backgroundColor: "#b8d0ce" },
  buttonText: { color: C.white, fontWeight: "600" },

  back: { color: C.teal, fontWeight: "600", marginBottom: 15 },
  field: { marginBottom: 15 },
  label: { color: C.dark, fontSize: 14, fontWeight: "500", marginBottom: 6 },

  input: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 15, padding: 14, color: C.dark, fontSize: 14,
  },
  fieldError: { color: C.error, fontSize: 11, marginTop: 4 },

  box: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 15, overflow: "hidden",
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: 10, padding: 13,
  },
  check: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 1.5,
    borderColor: "#b0c8c6", alignItems: "center", justifyContent: "center",
  },
  checked: { backgroundColor: C.teal, borderColor: C.teal },
  tick: { color: C.white, fontWeight: "bold", fontSize: 11 },
  condition: { color: C.dark, fontSize: 13 },

  options: {
    backgroundColor: C.light, padding: 10,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  option: {
    flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 6,
  },
  smallRadio: {
    width: 17, height: 17, borderRadius: 9, borderWidth: 1.5,
    borderColor: C.border, alignItems: "center", justifyContent: "center",
  },
  optionText: { flex: 1, color: C.dark, fontSize: 11 },

  rules: {
    backgroundColor: C.light, padding: 10, borderRadius: 10, marginTop: 7,
  },
  rule: { color: C.gray, fontSize: 11, marginVertical: 2 },

  toggle: {
    position: "absolute", right: 14, top: 14,
  },
  toggleText: { color: C.teal, fontSize: 11, fontWeight: "600" },

  terms: {
    flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 8,
  },
  termsText: { flex: 1, color: C.gray, fontSize: 11, lineHeight: 17 },
  link: { color: C.teal, fontWeight: "600" },

  error: {
    color: C.error, textAlign: "center", fontSize: 12, marginBottom: 7,
  },
  footer: {
    textAlign: "center", color: C.gray, fontSize: 12, marginTop: 12,
  },

  success: {
    backgroundColor: C.white, padding: 25, borderRadius: 20,
    alignItems: "center",
  },
  successIcon: {
    backgroundColor: C.success, color: C.white, width: 65, height: 65,
    borderRadius: 33, textAlign: "center", lineHeight: 65,
    fontSize: 38, fontWeight: "bold",
  },
  successTitle: {
    color: C.dark, fontSize: 20, fontWeight: "bold", marginTop: 14,
  },
  successText: {
    color: C.gray, textAlign: "center", lineHeight: 20, marginVertical: 10,
  },
});