import { useState } from 'react';
import { useAuth } from './useAuth';
import { validateSignup } from '../utils/validation';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'expo-router';

export const useSignup = () => {
  const { signup, status, error, clearError } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const isLoading = status === 'loading';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  function clearFieldError() {
    setFieldError(null);
    clearError();
  }

  async function handleSignup() {
    clearError();
    const validationError = validateSignup(name, email, password);
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
    clearFieldError,
    isLoading,
    handleSignup,
    displayError,
  };
};
