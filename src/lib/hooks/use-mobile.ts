import * as React from "react"

// Below Tailwind's md, or a phone held sideways: the one test the `mobile` CSS variant repeats.
const MOBILE_QUERY = "(max-width: 767px), ((pointer: coarse) and (max-height: 767px))"
// Below this the list is a sheet: a list column, the side panel's minimum and a usable player do not fit. The `narrow` CSS variant repeats it.
const NARROW_QUERY = "(max-width: 1151px)"

// False until mounted, so the server and the first client render agree.
function useMatchMedia(query: string) {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)

    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [query])

  return matches
}

export function useIsMobile() {
  return useMatchMedia(MOBILE_QUERY)
}

export function useIsNarrow() {
  return useMatchMedia(NARROW_QUERY)
}
