import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { api } from "../../services/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const theme = useTheme();
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    setError(undefined);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      await api.requestPasswordReset(email.trim());
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setError(undefined);
    if (token.length < 6) {
      setError("Enter the code from your email");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api.confirmPasswordReset(email.trim(), token.trim(), newPassword, confirmNewPassword);
      navigation.replace("Login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reset your password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {step === "request" ? (
          <>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Reset your password</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Enter your account email — we'll send a reset code to it.
            </Text>
            <View style={{ marginTop: spacing.lg }}>
              <Input
                label="Email"
                placeholder="you@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                error={error}
                autoFocus
              />
            </View>
            <View style={styles.footer}>
              <Button label="Send reset code" onPress={handleRequest} loading={loading} />
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Check your email</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Enter the code we sent to {email}, and your new password.
            </Text>
            <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
              <Input label="Reset code" placeholder="123456" keyboardType="number-pad" value={token} onChangeText={setToken} />
              <Input
                label="New password"
                placeholder="At least 8 characters"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <Input
                label="Confirm new password"
                placeholder="Type it again"
                secureTextEntry
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                error={error}
              />
            </View>
            <View style={styles.footer}>
              <Button label="Reset password" onPress={handleConfirm} loading={loading} />
            </View>
          </>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold, marginTop: spacing.xl },
  subtitle: { fontSize: typography.sizes.md, marginTop: spacing.xs },
  footer: { marginTop: spacing.xl },
});
