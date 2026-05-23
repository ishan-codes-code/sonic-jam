import { Redirect } from 'expo-router';

export default function NotificationClickRedirect() {
    // When the user taps the media notification, Android fires sonic://notification.click
    // This route acts as a transparent bounce exactly into the player.
    return <Redirect href="/player" />;
}
