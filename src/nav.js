function initScrollBehavior() {
  const nav = document.querySelector('.nav_component')
  if (!nav) return

  gsap.fromTo(
    nav,
    { y: 0 },
    {
      y: '-2.75rem',
      ease: 'none',
      scrollTrigger: {
        start: 0,
        end: 30,
        scrub: true,
      },
    }
  )

  let hidden = false
  ScrollTrigger.create({
    start: 1000,
    end: 'max',
    onUpdate: (self) => {
      const shouldHide = self.direction === 1
      if (shouldHide === hidden) return
      hidden = shouldHide
      gsap.to(nav, {
        yPercent: shouldHide ? -120 : 0,
        duration: 0.4,
        ease: 'power2.out',
      })
    },
    onLeaveBack: () => {
      if (!hidden) return
      hidden = false
      gsap.to(nav, { yPercent: 0, duration: 0.4, ease: 'power2.out' })
    },
  })
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
