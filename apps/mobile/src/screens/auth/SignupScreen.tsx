import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { api } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export function SignupScreen({ navigation }: Props) {
  const theme = useTheme();
  const setSession = useAuthStore((s) => s.setSession);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const validate = () => {
    const next: Record<string, string> = {};
    if (!displayName.trim()) next.displayName = "Tell us what to call you";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address";
    if (password.length < 8) next.password = "At least 8 characters";
    if (password !== confirmPassword) next.confirmPassword = "Passwords do not match";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignup = async () => {
    setFormError(undefined);
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await api.signup(displayName.trim(), email.trim(), password, confirmPassword);
      setSession(result);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't create your account — try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: theme.textPrimary }]}>Create your account</Text>

          <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
            <Input
              label="Your name"
              placeholder="Jordan Rivera"
              value={displayName}
              onChangeText={setDisplayName}
              error={errors.displayName}
              autoFocus
            />
            <Input
              label="Email"
              placeholder="you@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              textContentType="emailAddress"
            />
            <Input
              label="Password"
              placeholder="At least 8 characters"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              textContentType="newPassword"
            />
            <Input
              label="Confirm password"
              placeholder="Type it again"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={errors.confirmPassword}
              textContentType="newPassword"
            />
          </View>

          {formError ? <Text style={[styles.formError, { color: theme.error }]}>{formError}</Text> : null}

          <View style={{ marginTop: spacing.xl }}>
            <Button label="Create account" onPress={handleSignup} loading={loading} />
          </View>

          <Button
            label="Already have an account? Log in"
            variant="ghost"
            onPress={() => navigation.replace("Login")}
          />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold, marginTop: spacing.xl },
  formError: { marginTop: spacing.md, fontSize: typography.sizes.sm },
});
