import React, { memo } from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';

export interface ProfileAvatarProps extends TouchableOpacityProps {
  /**
   * The width and height of the avatar in pixels.
   * @default 35
   */
  size?: number;
}

const DEFAULT_SIZE = 35;

export const ProfileAvatar = memo(
  ({ className, size = DEFAULT_SIZE, style, ...props }: ProfileAvatarProps) => {
    const router = useRouter();

    const handlePress = () => {
      // Routes to the profile screen as requested
      router.push('/profile');
    };

    // Calculate a proportional size for the inner user icon
    const iconSize = size * 0.55;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="Go to profile"
        style={[{ width: size, height: size }, style]}
        className={cn(
          'rounded-full bg-white/5 border border-white/10 items-center justify-center',
          className
        )}
        {...props}
      >
        <Icon as={User} size={iconSize} className='text-muted-foreground' />
      </TouchableOpacity>
    );
  }
);

ProfileAvatar.displayName = 'ProfileAvatar';
