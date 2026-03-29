import { YouTubeVideo } from '../../../services/youtube';

export interface MediaCardProps {
  item: YouTubeVideo;
  variant: 'large' | 'compact';
  onPress: (item: YouTubeVideo) => void;
  onLongPress?: (item: YouTubeVideo) => void;
}
