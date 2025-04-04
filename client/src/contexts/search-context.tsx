"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface SearchContextType {
  isSearchActive: boolean
  setIsSearchActive: (active: boolean) => void
  focusSearch: () => void
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isSearchActive, setIsSearchActive] = useState(false)

  const focusSearch = () => {
    setIsSearchActive(true)
  }

  return (
    <SearchContext.Provider value={{ isSearchActive, setIsSearchActive, focusSearch }}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const context = useContext(SearchContext)
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider")
  }
  return context
}

