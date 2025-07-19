import { gsap } from 'gsap'

/**
 * Animation utilities for consistent component animations across the app
 */

/**
 * Animates a container sliding down from the top with bounce effect
 * @param {HTMLElement} element - The DOM element to animate
 * @param {Object} options - Animation options
 * @param {number} options.duration - Animation duration in seconds (default: 0.8)
 * @param {string} options.ease - GSAP easing function (default: "back.out(1.4)")
 * @param {number} options.yOffset - Initial Y offset in pixels (default: -100)
 * @param {number} options.scale - Initial scale (default: 0.9)
 * @returns {gsap.core.Tween} The GSAP animation instance
 */
export const animateSlideDownEntry = (element, options = {}) => {
  const {
    duration = 0.8,
    ease = "back.out(1.4)",
    yOffset = -100,
    scale = 0.9
  } = options

  if (!element) return null

  // Set initial position
  gsap.set(element, {
    y: yOffset,
    opacity: 0,
    scale
  })

  // Animate to final position
  return gsap.to(element, {
    y: 0,
    opacity: 1,
    scale: 1,
    duration,
    ease,
    clearProps: "transform"
  })
}

/**
 * Animates a container sliding up and fading out
 * @param {HTMLElement} element - The DOM element to animate
 * @param {Object} options - Animation options
 * @param {number} options.duration - Animation duration in seconds (default: 0.6)
 * @param {string} options.ease - GSAP easing function (default: "back.in(1.4)")
 * @param {number} options.yOffset - Final Y offset in pixels (default: -100)
 * @param {number} options.scale - Final scale (default: 0.9)
 * @param {Function} options.onComplete - Callback function to execute when animation completes
 * @returns {gsap.core.Tween} The GSAP animation instance
 */
export const animateSlideUpExit = (element, options = {}) => {
  const {
    duration = 0.6,
    ease = "back.in(1.4)",
    yOffset = -100,
    scale = 0.9,
    onComplete = null
  } = options

  if (!element) return Promise.resolve()

  return gsap.to(element, {
    y: yOffset,
    opacity: 0,
    scale,
    duration,
    ease,
    onComplete
  })
}

/**
 * Creates a cascade animation for multiple elements
 * @param {Array} elements - Array of objects with element and animation config
 * @param {Object} globalOptions - Global options for the timeline
 * @param {number} globalOptions.stagger - Stagger delay between animations (default: 0.2)
 * @returns {gsap.core.Timeline} The GSAP timeline instance
 */
export const animateCascade = (elements, globalOptions = {}) => {
  const { stagger = 0.2 } = globalOptions
  const tl = gsap.timeline()

  elements.forEach((item, index) => {
    const {
      element,
      from = { opacity: 0, y: 20 },
      to = { opacity: 1, y: 0 },
      duration = 0.4,
      ease = "power2.out"
    } = item

    if (element) {
      const offset = index === 0 ? 0 : `-=${stagger}`
      tl.fromTo(element, from, { ...to, duration, ease }, offset)
    }
  })

  return tl
}

/**
 * Animates an icon with scale and rotation
 * @param {HTMLElement} element - The DOM element to animate
 * @param {Object} options - Animation options
 * @param {number} options.duration - Animation duration in seconds (default: 0.6)
 * @param {string} options.ease - GSAP easing function (default: "back.out(1.7)")
 * @param {number} options.rotation - Rotation in degrees (default: -180)
 * @returns {gsap.core.Tween} The GSAP animation instance
 */
export const animateIconEntry = (element, options = {}) => {
  const {
    duration = 0.6,
    ease = "back.out(1.7)",
    rotation = -180
  } = options

  if (!element) return null

  return gsap.fromTo(element,
    { scale: 0, rotation },
    { scale: 1, rotation: 0, duration, ease }
  )
}

/**
 * Animates a spinner with continuous rotation
 * @param {HTMLElement} element - The DOM element to animate
 * @param {Object} options - Animation options
 * @param {number} options.duration - Duration for one full rotation (default: 1)
 * @param {string} options.ease - GSAP easing function (default: "none")
 * @returns {gsap.core.Tween} The GSAP animation instance
 */
export const animateSpinner = (element, options = {}) => {
  const {
    duration = 1,
    ease = "none"
  } = options

  if (!element) return null

  return gsap.to(element, {
    rotation: 360,
    duration,
    repeat: -1,
    ease
  })
}

/**
 * Animates a smooth upward movement (for filling space)
 * @param {HTMLElement} element - The DOM element to animate
 * @param {Object} options - Animation options
 * @param {number} options.duration - Animation duration in seconds (default: 0.6)
 * @param {string} options.ease - GSAP easing function (default: "power2.out")
 * @param {number} options.yOffset - Y offset in pixels (default: -20)
 * @returns {gsap.core.Tween} The GSAP animation instance
 */
export const animateMoveUp = (element, options = {}) => {
  const {
    duration = 0.6,
    ease = "power2.out",
    yOffset = -20
  } = options

  if (!element) return null

  return gsap.to(element, {
    y: yOffset,
    duration,
    ease,
    onComplete: () => {
      gsap.set(element, { clearProps: "transform" })
    }
  })
}

/**
 * Higher-order function to create component animation hooks
 * @param {Object} refs - Object containing template refs
 * @param {Object} config - Configuration for animations
 * @returns {Object} Animation functions for the component
 */
export const createComponentAnimations = (refs, config = {}) => {
  const {
    containerRef = 'container',
    entryDelay = 200,
    cascadeElements = []
  } = config

  return {
    animateEntry: () => {
      const container = refs[containerRef]?.value
      if (container) {
        animateSlideDownEntry(container)

        if (cascadeElements.length > 0) {
          setTimeout(() => {
            const elements = cascadeElements.map(elementConfig => ({
              element: refs[elementConfig.ref]?.value,
              ...elementConfig
            })).filter(item => item.element)

            if (elements.length > 0) {
              animateCascade(elements)
            }
          }, entryDelay)
        }
      }
    },

    animateExit: (onComplete) => {
      const container = refs[containerRef]?.value
      if (container) {
        return animateSlideUpExit(container, { onComplete })
      }
      return Promise.resolve()
    },

    animateContent: () => {
      if (cascadeElements.length > 0) {
        const elements = cascadeElements.map(elementConfig => ({
          element: refs[elementConfig.ref]?.value,
          ...elementConfig
        })).filter(item => item.element)

        if (elements.length > 0) {
          return animateCascade(elements)
        }
      }
      return null
    }
  }
}
