import { useEffect, useState } from "react"
import { getColors } from "react-native-image-colors"

export const useBackgroundColors = (imageUrl: string) => {
    const [imageColors, setImageColors] = useState<any>({})
    useEffect(() => {
        getColors(imageUrl, {
            fallback: "#000000",
            cache: true,
            key: imageUrl,
        }).then(colors =>
            setImageColors(colors)
        )
    }, [imageUrl])

    return { imageColors }
}