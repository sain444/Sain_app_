import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { api } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(undefined);
    if (!email.trim() || !password) {
      setError("Enter your email and password");
      return;
    }
    setLoading(true);
    try {
      const result = await api.login(email.trim(), password);
      setSession(result);
    } catch (err) {
      // Deliberately generic — the server also returns the same message for
      // "no such account" and "wrong password" to avoid leaking which
      // emails have accounts.
      setError(err instanceof Error ? err.message : "Couldn't log in — try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Welcome back</Text>

        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <Input
            label="Email"
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            autoFocus
            textContentType="emailAddress"
          />
          <Input
            label="Password"
            placeholder="Your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={error}
            textContentType="password"
          />
        </View>

        <Button
          label="Forgot password?"
          variant="ghost"
          onPress={() => navigation.navigate("ForgotPassword")}
        />

        <View style={styles.footer}>
          <Button label="Log in" onPress={handleLogin} loading={loading} />
          <Button label="Don't have an account? Sign up" variant="ghost" onPress={() => navigation.replace("Signup")} />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold, marginTop: spacing.xl },
  footer: { marginTop: "auto", paddingBottom: spacing.lg },
});
