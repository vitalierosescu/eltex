const splitConfig = {
  lines: { duration: 0.8, stagger: 0.08 },
  words: { duration: 0.6, stagger: 0.06 },
  chars: { duration: 0.4, stagger: 0.01 },
}

/**
 * Reusable text reveal animation.
 * @param {Element} element - The element with data-split attribute
 * @param {Object} [options]
 * @param {Object} [options.scrollTrigger] - ScrollTrigger config. If omitted, plays immediately.
 * @param {number} [options.delay] - Delay before animation starts
 * @param {string} [options.type] - Override split type ('lines', 'words', 'chars')
 */
export function splitReveal(element, options = {}) {
  const splitType = element.dataset.split || 'text'
  const type = options.type || element.dataset.splitReveal || 'lines'
  const typesToSplit =
    type === 'lines'
      ? ['lines']
      : type === 'words'
        ? ['lines', 'words']
        : ['lines', 'words', 'chars']

  SplitText.create(element, {
    type: typesToSplit.join(', '),
    mask: 'lines',
    autoSplit: true,
    linesClass: 'line',
    wordsClass: 'word',
    charsClass: splitType === 'heading' ? 'letter' : undefined,
    onSplit: function (instance) {
      const targets = instance[type]
      const config = splitConfig[type]

      // Hide targets immediately so text is invisible until animated
      gsap.set(targets, { yPercent: 110 })

      const tweenVars = {
        yPercent: 0,
        stagger: parseInt(element.dataset.stagger) || config.stagger,
        duration: parseInt(element.dataset.duration) || config.duration,
        ease: 'expo.out',
        delay: options.delay || 0,
      }

      if (options.scrollTrigger) {
        tweenVars.scrollTrigger = options.scrollTrigger
      }

      return gsap.to(targets, tweenVars)
    },
  })
}
