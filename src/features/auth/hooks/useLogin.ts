import { useState } from 'react';
import { useAuth } from './useAuth';
import { validateLogin } from '../utils/validation';

export const useLogin = () => {
  const { login, status, error, clearError } = useAuth();
  const isLoading = status === 'loading';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleLogin() {
    clearError();
    const validationError = validateLogin(email, password);
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
    fieldError,
    setFieldError,
    isLoading,
    handleLogin,
    displayError,
  };
};
