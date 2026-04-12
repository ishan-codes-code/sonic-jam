import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { useRouter } from 'expo-router';

function validate(name: string, email: string, password: string): string | null {
  if (!name.trim()) return 'Full name is required.';
  if (!email.trim()) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

export const useSignupLogic = () => {
  const { signup, status, error, clearError } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const isLoading = status === 'loading';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  function clearFieldError() {
    setFieldError(null);
    clearError();
  }

  async function handleSignup() {
    clearError();
    const validationError = validate(name, email, password);
    if (validationError) {
      setFieldError(validationError);
      return;
    }
    setFieldError(null);
    try {
      await signup({ name: name.trim(), email: email.trim().toLowerCase(), password });
      toast.success('Registration successful! Please login.');
      router.push('/login');
    } catch {
      // Error is in the store
    }
  }

  const displayError = fieldError ?? error;

  return {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    focusedField,
    setFocusedField,
    clearFieldError,
    isLoading,
    handleSignup,
    displayError,
  };
};
