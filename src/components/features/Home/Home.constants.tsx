import React from 'react';
import {
  Briefcase,
  Heart,
  Moon,
  Zap
} from 'lucide-react-native';

export const RECENTLY_PLAYED = [
  { id: '1', title: 'Star Gazer', artist: 'Ishan Ray', artwork: require('../../../../assets/images/album_star_gazer.png') },
  { id: '2', title: 'Analog Dreams', artist: 'Synth Collective', artwork: require('../../../../assets/images/album_analog_dreams.png') },
];

export const ARTISTS = [
  { id: '1', name: 'The Void', image: require('../../../../assets/images/artist_1.png') },
  { id: '2', name: 'Nova Luna', image: require('../../../../assets/images/artist_2.png') },
  { id: '3', name: 'Echo Soul', image: require('../../../../assets/images/artist_3.png') },
];

export const QUICK_MIXES = [
  { id: '1', title: 'Energy Boost', tracks: '24 Tracks', color: '#9547f7', icon: <Zap size={24} color="white" /> },
  { id: '2', title: 'Chill Evening', tracks: '18 Tracks', color: '#00e3fd', icon: <Moon size={24} color="white" /> },
  { id: '3', title: 'Love Songs', tracks: '33 Tracks', color: '#ff6e84', icon: <Heart size={24} color="white" /> },
  { id: '4', title: 'Focus Mode', tracks: '50 Tracks', color: '#3b82f6', icon: <Briefcase size={24} color="white" /> },
];
