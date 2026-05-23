import { Ionicons } from "@expo/vector-icons";
import AntDesign from '@expo/vector-icons/AntDesign';


type SocialItem = {
    icon: typeof AntDesign | typeof Ionicons;
    iconName: string;
    name: string;
    link: string;
};

export const SOCIALS: readonly SocialItem[] = [
    {
        icon: Ionicons,
        name: "LinkedIn",
        iconName: "logo-linkedin",
        link: "https://www.linkedin.com/in/ishan-srivastava-14309833b",
    },
    {
        icon: AntDesign,
        name: "X (Twitter)",
        iconName: "x",
        link: "https://x.com/itsIshanS",
    },
    {
        icon: Ionicons,
        name: "Instagram",
        iconName: "logo-instagram",
        link: "https://www.instagram.com/srivastava.ishan80",
    },
    {
        icon: AntDesign,
        name: "GitHub",
        iconName: "github",
        link: "https://github.com/ishan-codes-code",
    },
] as const;