import { SearchFocusScreen, SearchScreen } from "@/features/search";
import { useState } from "react";

export default function SearchPage() {
    const [searchFocus, setSearchFocus] = useState(false);

    if (searchFocus) {
        return <SearchFocusScreen searchFocus={searchFocus} setSearchFocus={setSearchFocus} />
    }

    return <SearchScreen searchFocus={searchFocus} setSearchFocus={setSearchFocus} />
}