function initScrollBehavior() {
  const nav = document.querySelector('.nav_component')
  if (!nav) return

  const offsetY = 2
  const scrollThreshold = offsetY + 1000
  let oldScroll = 0

  function update() {
    const scrollY = window.scrollY

    // Add/remove is-active based on scroll position
    nav.classList.toggle('is--scrolled', scrollY > offsetY)

    // Add/remove is-scrolled for hide-on-scroll behavior
    const shouldHide =
      scrollY > scrollThreshold && scrollY > oldScroll && nav.classList.contains('is--scrolled')
    nav.classList.toggle('is--scrolled-full', shouldHide)

    oldScroll = scrollY
  }

  // Initial check
  update()

  // Listen for scroll
  window.addEventListener('scroll', update, { passive: true })
}

function animateLogoOnLoad() {
  let logoPaths = document.querySelectorAll('.nav_logo path')

  gsap.fromTo(
    logoPaths,
    {
      scale: 0,
      rotate: () => Math.random() * 24 - 12,
    },
    {
      scale: 1,
      rotate: 0,
      stagger: 0.015,
      ease: 'back.out(3)',
      duration: 0.8,
    }
  )
}

function animateFooterLogoOnScroll() {
  let logoPaths = document.querySelectorAll('.footer_logo-link path')

  gsap.fromTo(
    logoPaths,
    {
      scale: 0,
      rotate: () => Math.random() * 24 - 12,
    },
    {
      scale: 1,
      rotate: 0,
      stagger: 0.015,
      ease: 'back.out(3)',
      duration: 0.8,
      scrollTrigger: {
        trigger: '.footer_logo-link',
        start: 'top 95%',
        toggleActions: 'play none none none',
      },
    }
  )
}

export const initNav = () => {
  initScrollBehavior()
  animateLogoOnLoad()
  animateFooterLogoOnScroll()
}
