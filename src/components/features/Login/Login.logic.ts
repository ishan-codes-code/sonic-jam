import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';

function validate(email: string, password: string): string | null {
  if (!email.trim()) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  if (!password) return 'Password is required.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}

export const useLoginLogic = () => {
  const { login, status, error, clearError } = useAuth();
  const isLoading = status === 'loading';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleLogin() {
    clearError();
    const validationError = validate(email, password);
    if (validationError) {
      setFieldError(validationError);
      return;
    }
    setFieldError(null);
    try {
      await login({ email: email.trim().toLowerCase(), password });
    } catch {
      // Error is already set in the store
    }
  }

  const displayError = fieldError ?? error;

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    isEmailFocused,
    setIsEmailFocused,
    isPasswordFocused,
    setIsPasswordFocused,
    fieldError,
    setFieldError,
    isLoading,
    handleLogin,
    displayError,
  };
};
