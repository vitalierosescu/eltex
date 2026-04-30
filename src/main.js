import gsap from 'gsap'
import { BREAKPOINTS } from './utils/breakpoints.js'
import { initHome } from './pages/home.js'
import { initContact } from './pages/contact.js'
import { initProduct } from './pages/product.js'
import { initGlobal } from './global.js'
import { initNav } from './nav.js'
/** */
;(() => {
  if (!window.gsap) window.gsap = gsap

  const CONFIG = {
    breakpoints: BREAKPOINTS,
    selectors: {
      pageWrapper: '.page-wrap',
    },
  }

  function init() {
    const page = document.querySelector(CONFIG.selectors.pageWrapper)
    if (!page) return

    if (page.classList.contains('is-home')) initHome()
    if (page.classList.contains('is-contact')) initContact()
    if (page.classList.contains('is-product')) initProduct()

    initNav()
    initGlobal()
  }

  try {
    init()
  } catch (error) {
    console.log('[Main] Failed to initialize:', error)
  }
})()
