export const BREAKPOINTS = {
  tablet: 991,
  mobileLandscape: 767,
  mobile: 478,
}

/** Media query strings for gsap.matchMedia() */
export const MQ = {
  desktop: `(min-width: ${BREAKPOINTS.tablet + 1}px)`,
  tabletDown: `(max-width: ${BREAKPOINTS.tablet}px)`,
  tabletUp: `(min-width: ${BREAKPOINTS.mobileLandscape + 1}px)`,
  tabletOnly: `(min-width: ${BREAKPOINTS.mobileLandscape + 1}px) and (max-width: ${BREAKPOINTS.tablet}px)`,
  mobileLandscapeDown: `(max-width: ${BREAKPOINTS.mobileLandscape}px)`,
  mobileDown: `(max-width: ${BREAKPOINTS.mobile}px)`,
}
