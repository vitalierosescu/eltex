function toggleHiddenField(selectSelector, hiddenParentSelector, triggerValue) {
  const select = document.querySelector(selectSelector)
  const hiddenParent = document.querySelector(hiddenParentSelector)

  if (!select || !hiddenParent) return

  const update = () => {
    hiddenParent.classList.toggle('is--visible', select.value === triggerValue)
  }

  select.addEventListener('change', update)
  update() // run on init in case value is pre-selected
}

export function initContact() {
  // Usage
  toggleHiddenField(
    '.multi_block.is--incident select',
    '.multi_block.is--incident #photo-container',
    'fotovoltaica'
  )

  toggleHiddenField(
    '.multi_block.is--incident select',
    '.multi_block.is--incident #aero-container',
    'aerotermia'
  )
}
