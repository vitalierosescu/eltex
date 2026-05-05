function initExpandingFeaturePills() {
  const wraps = document.querySelectorAll('[data-feature-pills-init]')
  if (!wraps.length) return

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  wraps.forEach((wrap, wrapIdx) => {
    const items = Array.from(wrap.querySelectorAll('[data-feature-pills-item]'))
    const visuals = Array.from(wrap.querySelectorAll('[data-feature-pills-visual]'))
    const cover = wrap.querySelector('[data-feature-pills-cover]')
    const closeBtn = wrap.querySelector('[data-feature-pills-close]')
    if (!items.length) return

    if (visuals.length && visuals.length !== items.length) {
      console.warn(
        `[ExpandingFeaturePills] items (${items.length}) and visuals (${visuals.length}) mismatch in module #${wrapIdx}. Visual syncing uses index order.`
      )
    }

    const uidBase = `feature-pills-${wrapIdx}`
    const ease = 'back.out(2)'
    const animationDuration = 0.5

    const getExpandedWidth = () =>
      getComputedStyle(wrap).getPropertyValue('--content-item-expanded').trim() || ''

    const getActiveIndex = () => {
      const active = items.find((it) => it.getAttribute('data-active') === 'true')
      return active ? Number(active.getAttribute('data-feature-pills-index')) : null
    }

    const setWrapActive = (isActive) => {
      wrap.setAttribute('data-feature-pills-active', isActive ? 'true' : 'false')
      if (closeBtn) closeBtn.setAttribute('aria-hidden', isActive ? 'false' : 'true')
      if (cover) {
        cover.setAttribute('data-active', isActive ? 'false' : 'true')
        cover.setAttribute('aria-hidden', isActive ? 'true' : 'false')
      }
    }

    const setVisualActive = (indexOrNull) => {
      if (!visuals.length) return
      visuals.forEach((v) => {
        const idx = Number(v.getAttribute('data-feature-pills-index'))
        const isActive = indexOrNull !== null && idx === indexOrNull
        v.setAttribute('data-active', isActive ? 'true' : 'false')
        v.setAttribute('aria-hidden', isActive ? 'false' : 'true')
      })
    }

    const setItemA11y = (item, isOpen) => {
      const btn = item.querySelector('[data-feature-pills-button]')
      const content = item.querySelector('[data-feature-pills-content]')
      if (!btn || !content) return
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false')
      content.setAttribute('aria-hidden', isOpen ? 'false' : 'true')
    }

    const measureButtonH = (item) => {
      const btn = item.querySelector('[data-feature-pills-button]')
      return btn ? Math.ceil(btn.getBoundingClientRect().height) : 0
    }

    const measureInnerH = (item, expandedW) => {
      const inner = item.querySelector('[data-feature-pills-inner]')
      if (!inner) return 0

      const mask = item.querySelector('.feature-pills__item-mask')

      const prevMaskOverflow = mask ? mask.style.overflow : null
      if (mask) mask.style.overflow = 'visible'

      const prevMaxW = inner.style.maxWidth
      if (expandedW) inner.style.maxWidth = expandedW

      const h = Math.ceil(inner.getBoundingClientRect().height)

      if (expandedW) inner.style.maxWidth = prevMaxW || ''
      if (mask) mask.style.overflow = prevMaskOverflow || ''

      return h
    }

    const getHeights = (item, expandedW) => {
      const buttonH = measureButtonH(item)
      const innerH = measureInnerH(item, expandedW)
      const openH = Math.max(buttonH, innerH)
      return { buttonH, openH }
    }

    const collapsedWidthPx = new Map()

    const captureCollapsedWidths = () => {
      items.forEach((item) => {
        const prev = item.style.width
        item.style.width = ''
        collapsedWidthPx.set(item, Math.ceil(item.getBoundingClientRect().width))
        item.style.width = prev
      })
    }

    const animateBox = (el, vars) => {
      gsap.killTweensOf(el)
      if (prefersReducedMotion) {
        if (vars.height != null) el.style.height = `${vars.height}px`
        if (vars.width != null)
          el.style.width = typeof vars.width === 'number' ? `${vars.width}px` : vars.width
        return
      }
      gsap.to(el, { ...vars, duration: animationDuration, ease, overwrite: true })
    }

    const openItem = (item) => {
      const expandedW = getExpandedWidth()
      const { openH } = getHeights(item, expandedW)

      item.setAttribute('data-active', 'true')
      setItemA11y(item, true)
      setWrapActive(true)

      const targetW =
        expandedW ||
        `${collapsedWidthPx.get(item) || Math.ceil(item.getBoundingClientRect().width)}px`
      animateBox(item, { height: openH, width: targetW })
    }

    const closeItem = (item) => {
      const expandedW = getExpandedWidth()
      const { buttonH } = getHeights(item, expandedW)

      item.setAttribute('data-active', 'false')
      setItemA11y(item, false)

      const targetW = collapsedWidthPx.get(item) || Math.ceil(item.getBoundingClientRect().width)
      animateBox(item, { height: buttonH, width: targetW })
    }

    const switchTo = (nextIndex) => {
      const current = getActiveIndex()
      if (current === nextIndex) return

      const nextItem = items[nextIndex]
      if (!nextItem) return

      if (current !== null) closeItem(items[current])
      openItem(nextItem)

      setVisualActive(nextIndex)
    }

    const closeAll = () => {
      const current = getActiveIndex()
      if (current === null) return
      closeItem(items[current])
      setVisualActive(null)
      setWrapActive(false)
    }

    items.forEach((item, i) => {
      item.setAttribute('data-feature-pills-index', String(i))
      if (!item.hasAttribute('data-active')) item.setAttribute('data-active', 'false')

      const btn = item.querySelector('[data-feature-pills-button]')
      const content = item.querySelector('[data-feature-pills-content]')
      if (btn) {
        btn.setAttribute('data-feature-pills-index', String(i))
        btn.type = 'button'
        const triggerId = `${uidBase}-trigger-${i}`
        if (!btn.id) btn.id = triggerId
      }
      if (content && btn) {
        content.setAttribute('data-feature-pills-index', String(i))
        const panelId = `${uidBase}-panel-${i}`
        if (!content.id) content.id = panelId
        btn.setAttribute('aria-controls', content.id)
        content.setAttribute('role', 'region')
        content.setAttribute('aria-labelledby', btn.id)
        if (!content.hasAttribute('aria-hidden')) content.setAttribute('aria-hidden', 'true')
        if (!btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded', 'false')
      }
    })

    visuals.forEach((v, i) => v.setAttribute('data-feature-pills-index', String(i)))

    if (closeBtn) {
      closeBtn.type = 'button'
      if (!closeBtn.hasAttribute('aria-hidden')) closeBtn.setAttribute('aria-hidden', 'true')
      closeBtn.addEventListener('click', closeAll)
    }

    items.forEach((item) => {
      const h = measureButtonH(item)
      item.style.height = `${h}px`
    })

    setWrapActive(false)
    setVisualActive(null)

    items.forEach((item, i) => {
      const btn = item.querySelector('[data-feature-pills-button]')
      if (!btn) return
      btn.addEventListener('click', () => switchTo(i))
    })

    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll()
    })

    const debounce = (fn, wait = 150) => {
      let t
      return (...args) => {
        clearTimeout(t)
        t = setTimeout(() => fn(...args), wait)
      }
    }

    const handleResize = () => {
      const current = getActiveIndex()

      items.forEach((item) => {
        if (item.getAttribute('data-active') !== 'true') item.style.width = ''
      })

      captureCollapsedWidths()

      if (current !== null) {
        const item = items[current]
        const expandedW = getExpandedWidth()
        const { openH } = getHeights(item, expandedW)
        const targetW = expandedW || ''

        if (prefersReducedMotion) {
          item.style.height = `${openH}px`
          if (targetW) item.style.width = targetW
        } else {
          const fallbackW = `${Math.ceil(item.getBoundingClientRect().width)}px`
          const widthForActive = targetW || fallbackW

          gsap.set(item, { height: openH, width: widthForActive })
          if (targetW) item.style.width = targetW
        }
      } else {
        items.forEach((item) => {
          const h = measureButtonH(item)
          item.style.height = `${h}px`
        })
      }
    }

    const debouncedResize = debounce(handleResize, 200)

    captureCollapsedWidths()
    window.addEventListener('resize', debouncedResize, { passive: true })
  })
}

function initRotatingText() {
  document.querySelectorAll('[data-rotating-title]').forEach((heading) => {
    const stepDuration = parseFloat(heading.getAttribute('data-step-duration') || '1.75')

    const rotatingSpan = heading.querySelector('[data-rotating-words]')
    if (!rotatingSpan) return

    const rawWords = rotatingSpan.getAttribute('data-rotating-words') || ''
    const words = rawWords
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean)
    if (!words.length) return

    // Build the rotating structure
    const wrapper = document.createElement('span')
    wrapper.className = 'rotating-text__inner'

    words.forEach((word) => {
      const el = document.createElement('span')
      el.className = 'rotating-text__word'
      el.textContent = word
      wrapper.appendChild(el)
    })

    rotatingSpan.textContent = ''
    rotatingSpan.appendChild(wrapper)

    // Animation state
    let delayedCall = null
    let activeIndex = 0
    let splitInstance = null
    let wordWidths = []

    function startAnimation() {
      const newWrapper = heading.querySelector('.rotating-text__inner')
      const wordEls = heading.querySelectorAll('.rotating-text__word')

      if (!newWrapper || !wordEls.length) return

      const inDuration = 0.75
      const outDuration = 0.6

      // Measure each word's width INDIVIDUALLY
      wordWidths = []
      Array.from(wordEls).forEach((el) => {
        // Make this word relative and visible to measure
        gsap.set(el, { position: 'relative', autoAlpha: 1, yPercent: 0 })
        wordWidths.push(el.getBoundingClientRect().width)
        // Hide it again
        gsap.set(el, { position: 'absolute', autoAlpha: 0, yPercent: 150 })
      })

      // Set up first word to establish height
      gsap.set(wordEls[0], { position: 'relative' })

      // Show active word
      gsap.set(wordEls[activeIndex], { yPercent: 0, autoAlpha: 1 })

      // Set initial wrapper width
      newWrapper.style.width = wordWidths[activeIndex] + 'px'

      function showNext() {
        const nextIndex = (activeIndex + 1) % wordEls.length
        const prev = wordEls[activeIndex]
        const current = wordEls[nextIndex]
        const targetWidth = wordWidths[nextIndex]

        gsap.to(newWrapper, {
          width: targetWidth,
          duration: inDuration,
          ease: 'power4.inOut',
        })

        if (prev && prev !== current) {
          gsap.to(prev, {
            yPercent: -150,
            autoAlpha: 0,
            duration: outDuration,
            ease: 'power4.inOut',
          })
        }

        gsap.fromTo(
          current,
          { yPercent: 150, autoAlpha: 0 },
          { yPercent: 0, autoAlpha: 1, duration: inDuration, ease: 'power4.inOut' }
        )

        activeIndex = nextIndex
        delayedCall = gsap.delayedCall(stepDuration, showNext)
      }

      if (wordEls.length > 1) {
        delayedCall = gsap.delayedCall(stepDuration, showNext)
      }
    }

    function doSplit() {
      if (delayedCall) {
        delayedCall.kill()
        delayedCall = null
      }

      const existingWrapper = heading.querySelector('.rotating-text__inner')
      const existingWords = heading.querySelectorAll('.rotating-text__word')
      if (existingWrapper) gsap.killTweensOf(existingWrapper)
      if (existingWords.length) gsap.killTweensOf(existingWords)

      if (splitInstance) {
        splitInstance.revert()
      }

      const currentRotatingSpan = heading.querySelector('[data-rotating-words]')
      if (currentRotatingSpan) {
        const newWrapper = document.createElement('span')
        newWrapper.className = 'rotating-text__inner'

        words.forEach((word) => {
          const el = document.createElement('span')
          el.className = 'rotating-text__word'
          el.textContent = word
          newWrapper.appendChild(el)
        })

        currentRotatingSpan.textContent = ''
        currentRotatingSpan.appendChild(newWrapper)
      }

      splitInstance = SplitText.create(heading, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'rotating-line',
      })

      requestAnimationFrame(startAnimation)
    }

    doSplit()

    let resizeTimer = null
    let lastWidth = window.innerWidth

    window.addEventListener('resize', () => {
      if (window.innerWidth === lastWidth) return
      lastWidth = window.innerWidth

      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        activeIndex = 0
        doSplit()
      }, 250)
    })
  })
}

const initFaq = () => {
  document.querySelectorAll('.accordion_wrap').forEach((component, listIndex) => {
    if (component.dataset.scriptInitialized) return
    component.dataset.scriptInitialized = 'true'

    const closePrevious = component.getAttribute('data-close-previous') !== 'false'
    const closeOnSecondClick = component.getAttribute('data-close-on-second-click') !== 'false'
    const openOnHover = component.getAttribute('data-open-on-hover') === 'true'
    const openByDefault =
      component.getAttribute('data-open-by-default') !== null &&
      !isNaN(+component.getAttribute('data-open-by-default'))
        ? +component.getAttribute('data-open-by-default')
        : false
    const list = component.querySelector('.accordion_list')
    let previousIndex = null,
      closeFunctions = []

    function removeCMSList(slot) {
      const dynList = Array.from(slot.children).find((child) =>
        child.classList.contains('w-dyn-list')
      )
      if (!dynList) return
      const nestedItems = dynList?.firstElementChild?.children
      if (!nestedItems) return
      const staticWrapper = [...slot.children]
      ;[...nestedItems].forEach(
        (el) => el.firstElementChild && slot.appendChild(el.firstElementChild)
      )
      staticWrapper.forEach((el) => el.remove())
    }
    removeCMSList(list)

    component.querySelectorAll('.accordion_component').forEach((card, cardIndex) => {
      const button = card.querySelector('.accordion_toggle_button')
      const content = card.querySelector('.accordion_content_wrap')
      const icon = card.querySelector('.accordion_toggle_icon')
      const iconSvg = card.querySelector('.accordion_toggle_svg')

      if (!button || !content || !icon) return console.warn('Missing elements:', card)

      button.setAttribute('aria-expanded', 'false')
      button.setAttribute('id', 'accordion_button_' + listIndex + '_' + cardIndex)
      content.setAttribute('id', 'accordion_content_' + listIndex + '_' + cardIndex)
      button.setAttribute('aria-controls', content.id)
      content.setAttribute('aria-labelledby', button.id)
      content.style.display = 'none'

      const refresh = () => {
        tl.invalidate()
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh()
      }
      const tl = gsap.timeline({
        paused: true,
        defaults: { duration: 0.3, ease: 'power1.inOut' },
        onComplete: refresh,
        onReverseComplete: refresh,
      })
      tl.set(content, { display: 'block' })
      tl.fromTo(content, { height: 0 }, { height: 'auto' })
      tl.fromTo(iconSvg, { rotate: 0 }, { rotate: -180 }, '<')

      const closeAccordion = () =>
        card.classList.contains('is-opened') &&
        (card.classList.remove('is-opened'),
        tl.reverse(),
        button.setAttribute('aria-expanded', 'false'))
      closeFunctions[cardIndex] = closeAccordion

      const openAccordion = (instant = false) => {
        if (closePrevious && previousIndex !== null && previousIndex !== cardIndex)
          closeFunctions[previousIndex]?.()
        previousIndex = cardIndex
        button.setAttribute('aria-expanded', 'true')
        card.classList.add('is-opened')
        instant ? tl.progress(1) : tl.play()
      }
      if (openByDefault === cardIndex + 1) openAccordion(true)

      button.addEventListener('click', () =>
        card.classList.contains('is-opened') && closeOnSecondClick
          ? (closeAccordion(), (previousIndex = null))
          : openAccordion()
      )
      if (openOnHover) button.addEventListener('mouseenter', () => openAccordion())
    })
  })
}

const formLogic = () => {
  // ===== ORIGIN URL: AUTO-FILL AFTER 1.5s + ON FORM CHANGE =====
  var originInputs = document.querySelectorAll('input[name="originUrl"]')
  console.log('[formLogic] originUrl inputs found:', originInputs.length)
  if (originInputs.length) {
    setTimeout(function () {
      originInputs.forEach(function (input) {
        input.value = window.location.href
        console.log('[formLogic] originUrl set via timeout:', input.value)
      })
    }, 1500)
    originInputs.forEach(function (input) {
      var form = input.closest('form')
      if (form) {
        form.addEventListener('change', function () {
          input.value = window.location.href
          console.log('[formLogic] originUrl updated on change:', input.value)
        })
      }
    })
  }

  // ===== REFERRER URL: PAGE USER CAME FROM =====
  var referrerInputs = document.querySelectorAll('input[name="referrerUrl"]')
  if (referrerInputs.length) {
    referrerInputs.forEach(function (input) {
      input.value = document.referrer || 'direct'
    })
  }

  // ===== FORM NAME: AUTO-FILL FROM data-name ATTRIBUTE =====
  document.querySelectorAll('input[name="formName"]').forEach(function (input) {
    var form = input.closest('form')
    if (form) {
      input.value = form.getAttribute('data-name') || form.getAttribute('name') || 'unknown'
    }
  })

  // ===== PHONE VALIDATION FOR ALL PHONE FIELDS =====
  var phoneInputs = document.querySelectorAll('input[type="tel"]')

  phoneInputs.forEach(function (input) {
    var form = input.closest('form')
    var dialCode = form ? form.querySelector('.dialCode') : null
    if (!dialCode && form) {
      dialCode = document.createElement('input')
      dialCode.type = 'hidden'
      dialCode.name = 'dialCode'
      dialCode.className = 'dialCode'
      form.appendChild(dialCode)
    }

    // Create error element via JS
    var errorEl = document.createElement('div')
    errorEl.className = 'form_field-error-msg'
    errorEl.textContent = ''
    var phoneWrap = input.closest('.form_field-wrap')
    if (phoneWrap) phoneWrap.appendChild(errorEl)
    else input.parentElement.appendChild(errorEl)

    var iti = intlTelInput(input, {
      initialCountry: 'es',
      placeholderNumberType: 'FIXED_LINE',
    })
    input.setAttribute('autocomplete', 'tel')

    var updateInputValue = function () {
      if (dialCode) {
        dialCode.value = '+' + iti.getSelectedCountryData().dialCode
      }
      // Write full international number back to the input
      input.value = iti.getNumber() // e.g. "+34722532205"
    }

    var reset = function () {
      input.classList.remove('error')
      errorEl.textContent = ''
      errorEl.style.display = 'none'
    }

    var errorMap = {
      0: 'Número inválido',
      1: 'Invalid country code',
      2: 'Demasiado corto',
      3: 'Demasiado largo',
      4: 'Número inválido',
    }

    var showError = function (msg) {
      input.classList.add('error')
      errorEl.textContent = msg
      errorEl.style.display = 'block'
    }

    var validate = function () {
      reset()
      if (input.value.trim()) {
        if (iti.isValidNumber()) {
          return true
        } else {
          var errorCode = iti.getValidationError()
          showError(errorMap[errorCode] || 'Número inválido')
          return false
        }
      }
      if (input.hasAttribute('required')) {
        showError('Campo obligatorio')
      }
      return false
    }

    input.addEventListener('input', updateInputValue, false)
    input.addEventListener('countrychange', updateInputValue, false)
    input.addEventListener('input', validate, false)
    input.addEventListener('blur', validate)
    input.addEventListener('countrychange', validate, false)

    // Block submit if invalid (click + Enter key)
    if (form) {
      form.addEventListener('submit', function (e) {
        input.value = iti.getNumber() // ensure full number on submit
        if (!iti.isValidNumber()) {
          e.preventDefault()
          validate()
        }
      })

      var submitBtn = form.querySelector('[type="submit"]')
      if (submitBtn) {
        submitBtn.addEventListener(
          'click',
          function (e) {
            input.value = iti.getNumber() // ensure full number on submit
            if (!iti.isValidNumber()) {
              e.preventDefault()
              validate()
            }
          },
          true
        )
      }
    }
  })

  // ===== CONDITIONAL REQUIRED: INCIDENT SUB-TYPE SELECTS =====
  document.querySelectorAll('select[name="instalacion"]').forEach(function (select) {
    var form = select.closest('form')
    if (!form) return

    var fotoSelect = form.querySelector('select[name="Incidencia-fotovoltaica"]')
    var aeroSelect = form.querySelector('select[name="Incidencia-aerotermia"]')

    function updateRequired() {
      var val = select.value
      if (fotoSelect) {
        if (val === 'fotovoltaica') {
          fotoSelect.setAttribute('required', '')
        } else {
          fotoSelect.removeAttribute('required')
          fotoSelect.value = ''
        }
      }
      if (aeroSelect) {
        if (val === 'aerotermia') {
          aeroSelect.setAttribute('required', '')
        } else {
          aeroSelect.removeAttribute('required')
          aeroSelect.value = ''
        }
      }
    }

    select.addEventListener('change', updateRequired)
    updateRequired()
  })

  // ===== PER-FIELD VALIDATION FOR ALL REQUIRED FIELDS =====
  document.querySelectorAll('form').forEach(function (form) {
    if (!form.querySelector('[required]')) return

    var errorEls = new Map()
    var processedRadios = new Set()
    var allFields = form.querySelectorAll('input, select, textarea')

    allFields.forEach(function (field) {
      if (field.type === 'hidden' || field.type === 'submit' || field.type === 'tel') return
      if (field.type === 'radio') {
        if (processedRadios.has(field.name)) return
        processedRadios.add(field.name)
      }

      var errorEl = document.createElement('div')
      errorEl.className = 'form_field-error-msg'
      errorEl.textContent = 'Campo obligatorio'

      var wrapper = field.closest('.form_field-wrap')
      if (wrapper) wrapper.appendChild(errorEl)
      else field.parentElement.appendChild(errorEl)

      if (field.type === 'radio') {
        form.querySelectorAll('input[name="' + field.name + '"]').forEach(function (r) {
          errorEls.set(r, errorEl)
        })
      } else {
        errorEls.set(field, errorEl)
      }

      // Clear error on user input
      function clearError() {
        var el = errorEls.get(field)
        if (!el) return
        el.style.display = 'none'
        field.classList.remove('error')
      }

      if (field.type === 'radio') {
        form.querySelectorAll('input[name="' + field.name + '"]').forEach(function (r) {
          r.addEventListener('change', clearError)
        })
      } else if (field.type === 'checkbox') {
        field.addEventListener('change', clearError)
      } else {
        field.addEventListener('input', clearError)
        field.addEventListener('change', clearError)
      }
    })

    var submitBtn = form.querySelector('[type="submit"]')
    if (!submitBtn) return

    submitBtn.addEventListener(
      'click',
      function (e) {
        var hasError = false
        var firstErrorEl = null
        var checkedRadios = {}

        // Re-query required fields each time (respects dynamic required changes)
        form.querySelectorAll('[required]').forEach(function (field) {
          if (field.type === 'tel') return

          var errorEl = errorEls.get(field)
          if (!errorEl) return

          // Radio group: check once per name
          if (field.type === 'radio') {
            if (checkedRadios[field.name] !== undefined) return
            var anyChecked = Array.from(
              form.querySelectorAll('input[name="' + field.name + '"]')
            ).some(function (r) {
              return r.checked
            })
            checkedRadios[field.name] = anyChecked
            if (!anyChecked) {
              errorEl.style.display = 'block'
              hasError = true
              if (!firstErrorEl) firstErrorEl = field
            } else {
              errorEl.style.display = 'none'
            }
            return
          }

          var isEmpty = false
          if (field.type === 'checkbox') {
            isEmpty = !field.checked
          } else if (field.tagName === 'SELECT') {
            isEmpty = field.value === ''
          } else {
            isEmpty = !field.value.trim()
          }

          // Email format check
          if (!isEmpty && field.type === 'email') {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) {
              errorEl.textContent = 'Email no válido'
              errorEl.style.display = 'block'
              field.classList.add('error')
              hasError = true
              if (!firstErrorEl) firstErrorEl = field
              return
            }
          }

          if (isEmpty) {
            errorEl.textContent = 'Campo obligatorio'
            errorEl.style.display = 'block'
            field.classList.add('error')
            hasError = true
            if (!firstErrorEl) firstErrorEl = field
          } else {
            errorEl.style.display = 'none'
            field.classList.remove('error')
          }
        })

        if (hasError) {
          e.preventDefault()
          if (firstErrorEl) {
            firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      },
      true
    )
  })

  // ===== ZIP CODE: MAX 5 CHARS, NO SPINNER ARROWS =====
  var zipInputs = document.querySelectorAll('input[name="zip"]')

  zipInputs.forEach(function (zipInput) {
    zipInput.setAttribute('maxlength', '5')

    if (zipInput.type === 'number') {
      zipInput.type = 'text'
      zipInput.inputMode = 'numeric'
      zipInput.pattern = '[0-9]*'
    }

    zipInput.addEventListener('input', function () {
      this.value = this.value.replace(/[^0-9]/g, '').slice(0, 5)
    })
  })
}

function initTabSystem() {
  const wrappers = document.querySelectorAll('[data-tabs="wrapper"]')

  wrappers.forEach((wrapper) => {
    const contentItems = wrapper.querySelectorAll('[data-tabs="content-item"]')

    const autoplay = wrapper.dataset.tabsAutoplay === 'true'
    const autoplayDuration = parseInt(wrapper.dataset.tabsAutoplayDuration) || 5000

    let activeContent = null // keep track of active item/link
    let isAnimating = false
    let progressBarTween = null // to stop/start the progress bar

    function startProgressBar(index) {
      if (progressBarTween) progressBarTween.kill()
      const bar = contentItems[index].querySelector('[data-tabs="item-progress"]')
      if (!bar) return

      // In this function, you can basically do anything you want, that should happen as a tab is active
      // Maybe you have a circle filling, some other element growing, you name it.
      gsap.set(bar, { scaleX: 0, transformOrigin: 'left center' })
      progressBarTween = gsap.to(bar, {
        scaleX: 1,
        duration: autoplayDuration / 1000,
        ease: 'power1.inOut',
        onComplete: () => {
          if (!isAnimating) {
            const nextIndex = (index + 1) % contentItems.length
            switchTab(nextIndex) // once bar is full, set next to active – this is important
          }
        },
      })
    }

    function switchTab(index) {
      if (isAnimating || contentItems[index] === activeContent) return

      isAnimating = true
      if (progressBarTween) progressBarTween.kill() // Stop any running progress bar here

      const outgoingContent = activeContent
      const outgoingBar = outgoingContent?.querySelector('[data-tabs="item-progress"]')

      const incomingContent = contentItems[index]
      const incomingBar = incomingContent.querySelector('[data-tabs="item-progress"]')

      outgoingContent?.classList.remove('active')
      incomingContent.classList.add('active')

      const tl = gsap.timeline({
        defaults: { duration: 0.65, ease: 'power3' },
        onComplete: () => {
          activeContent = incomingContent
          isAnimating = false
          if (autoplay) startProgressBar(index) // Start autoplay bar here
        },
      })

      if (outgoingContent) {
        tl.set(outgoingBar, { transformOrigin: 'right center' }).to(
          outgoingBar,
          { scaleX: 0, duration: 0.3 },
          0
        )
      }

      tl.set(incomingBar, { scaleX: 0, transformOrigin: 'left center' }, 0)
    }

    // on page load, set first to active
    // idea: you could wrap this in a scrollTrigger
    // so it will only start once a user reaches this section
    switchTab(0)

    // switch tabs on click
    contentItems.forEach((item, i) =>
      item.addEventListener('click', () => {
        if (item === activeContent) return // ignore click if current one is already active
        switchTab(i)
      })
    )
  })
}

function initStickyStepsBasic() {
  const containers = document.querySelectorAll('[data-sticky-steps-init]')
  if (!containers.length) return

  containers.forEach((container) => {
    const items = [...container.querySelectorAll('[data-sticky-steps-item]')]
    if (!items.length) return

    function updateSteps() {
      const viewportCenter = window.innerHeight / 2

      let closestIndex = 0
      let closestDistance = Infinity

      items.forEach((item, index) => {
        const anchor = item.querySelector('[data-sticky-steps-anchor]')
        if (!anchor) return

        const rect = anchor.getBoundingClientRect()
        const anchorCenter = rect.top + rect.height / 2
        const distance = Math.abs(viewportCenter - anchorCenter)

        if (distance < closestDistance) {
          closestDistance = distance
          closestIndex = index
        }
      })

      items.forEach((item, index) => {
        let status = 'active'

        if (index < closestIndex) status = 'before'
        if (index > closestIndex) status = 'after'

        item.setAttribute('data-sticky-steps-item-status', status)
      })
    }

    window.addEventListener('scroll', updateSteps)
    window.addEventListener('resize', updateSteps)

    requestAnimationFrame(updateSteps)
  })
}

export function initGlobal() {
  initFaq()
  formLogic()
  if (document.querySelector('[data-tabs="wrapper"]')) initTabSystem()
  if (document.querySelector('[data-sticky-steps-init]')) initStickyStepsBasic()
}
