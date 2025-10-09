// Infinite Pokédex - Animation Manager
// Handles all animations and transitions for Gen 9 Pokédex feel

export class AnimationManager {
  constructor() {
    this.isAnimationsEnabled = true;
    this.animationQueue = [];
    this.isProcessingQueue = false;

    // Check for reduced motion preference
    this.checkReducedMotion();
  }

  /**
   * Check if user prefers reduced motion
   */
  checkReducedMotion() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.isAnimationsEnabled = false;
      console.log('Animations disabled due to reduced motion preference');
    }
  }

  /**
   * Enable or disable animations
   * @param {boolean} enabled - Whether animations should be enabled
   */
  setAnimationsEnabled(enabled) {
    this.isAnimationsEnabled = enabled;

    if (!enabled) {
      // Remove all animation classes
      document.querySelectorAll('.animated-element').forEach((el) => {
        el.classList.remove('animated-element');
      });
    }
  }

  /**
   * Pause all animations
   */
  pauseAnimations() {
    document.body.style.animationPlayState = 'paused';
    document.body.style.transition = 'none';
  }

  /**
   * Resume all animations
   */
  resumeAnimations() {
    document.body.style.animationPlayState = 'running';
    document.body.style.transition = '';
  }

  /**
   * Fade in element
   * @param {HTMLElement} element - Element to animate
   * @param {number} duration - Animation duration in ms
   * @returns {Promise} Resolves when animation completes
   */
  fadeIn(element, duration = 300) {
    if (!this.isAnimationsEnabled) {
      element.style.opacity = '1';
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      element.style.opacity = '0';
      element.style.transition = `opacity ${duration}ms ease-out`;

      requestAnimationFrame(() => {
        element.style.opacity = '1';

        setTimeout(() => {
          element.style.transition = '';
          resolve();
        }, duration);
      });
    });
  }

  /**
   * Fade out element
   * @param {HTMLElement} element - Element to animate
   * @param {number} duration - Animation duration in ms
   * @returns {Promise} Resolves when animation completes
   */
  fadeOut(element, duration = 300) {
    if (!this.isAnimationsEnabled) {
      element.style.opacity = '0';
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      element.style.transition = `opacity ${duration}ms ease-out`;
      element.style.opacity = '0';

      setTimeout(() => {
        element.style.transition = '';
        resolve();
      }, duration);
    });
  }

  /**
   * Slide in element from direction
   * @param {HTMLElement} element - Element to animate
   * @param {string} direction - Direction ('left', 'right', 'up', 'down')
   * @param {number} duration - Animation duration in ms
   * @returns {Promise} Resolves when animation completes
   */
  slideIn(element, direction = 'left', duration = 400) {
    if (!this.isAnimationsEnabled) {
      element.style.transform = 'translateX(0) translateY(0)';
      element.style.opacity = '1';
      return Promise.resolve();
    }

    const transforms = {
      left: 'translateX(-100%)',
      right: 'translateX(100%)',
      up: 'translateY(-100%)',
      down: 'translateY(100%)',
    };

    return new Promise((resolve) => {
      element.style.transform = transforms[direction];
      element.style.opacity = '0';
      element.style.transition = `transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity ${duration}ms ease-out`;

      requestAnimationFrame(() => {
        element.style.transform = 'translateX(0) translateY(0)';
        element.style.opacity = '1';

        setTimeout(() => {
          element.style.transition = '';
          resolve();
        }, duration);
      });
    });
  }

  /**
   * Slide out element to direction
   * @param {HTMLElement} element - Element to animate
   * @param {string} direction - Direction ('left', 'right', 'up', 'down')
   * @param {number} duration - Animation duration in ms
   * @returns {Promise} Resolves when animation completes
   */
  slideOut(element, direction = 'right', duration = 400) {
    if (!this.isAnimationsEnabled) {
      const transforms = {
        left: 'translateX(-100%)',
        right: 'translateX(100%)',
        up: 'translateY(-100%)',
        down: 'translateY(100%)',
      };
      element.style.transform = transforms[direction];
      element.style.opacity = '0';
      return Promise.resolve();
    }

    const transforms = {
      left: 'translateX(-100%)',
      right: 'translateX(100%)',
      up: 'translateY(-100%)',
      down: 'translateY(100%)',
    };

    return new Promise((resolve) => {
      element.style.transition = `transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity ${duration}ms ease-out`;
      element.style.transform = transforms[direction];
      element.style.opacity = '0';

      setTimeout(() => {
        element.style.transition = '';
        resolve();
      }, duration);
    });
  }

  /**
   * Scale in element
   * @param {HTMLElement} element - Element to animate
   * @param {number} duration - Animation duration in ms
   * @returns {Promise} Resolves when animation completes
   */
  scaleIn(element, duration = 300) {
    if (!this.isAnimationsEnabled) {
      element.style.transform = 'scale(1)';
      element.style.opacity = '1';
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      element.style.transform = 'scale(0.9)';
      element.style.opacity = '0';
      element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;

      requestAnimationFrame(() => {
        element.style.transform = 'scale(1)';
        element.style.opacity = '1';

        setTimeout(() => {
          element.style.transition = '';
          resolve();
        }, duration);
      });
    });
  }

  /**
   * Scale out element
   * @param {HTMLElement} element - Element to animate
   * @param {number} duration - Animation duration in ms
   * @returns {Promise} Resolves when animation completes
   */
  scaleOut(element, duration = 300) {
    if (!this.isAnimationsEnabled) {
      element.style.transform = 'scale(0.9)';
      element.style.opacity = '0';
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
      element.style.transform = 'scale(0.9)';
      element.style.opacity = '0';

      setTimeout(() => {
        element.style.transition = '';
        resolve();
      }, duration);
    });
  }

  /**
   * Bounce animation
   * @param {HTMLElement} element - Element to animate
   * @param {number} duration - Animation duration in ms
   * @returns {Promise} Resolves when animation completes
   */
  bounce(element, duration = 600) {
    if (!this.isAnimationsEnabled) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      element.classList.add('bounce');

      setTimeout(() => {
        element.classList.remove('bounce');
        resolve();
      }, duration);
    });
  }

  /**
   * Wiggle animation for errors
   * @param {HTMLElement} element - Element to animate
   * @param {number} duration - Animation duration in ms
   * @returns {Promise} Resolves when animation completes
   */
  wiggle(element, duration = 500) {
    if (!this.isAnimationsEnabled) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      element.classList.add('wiggle');

      setTimeout(() => {
        element.classList.remove('wiggle');
        resolve();
      }, duration);
    });
  }

  /**
   * Pulse animation for loading states
   * @param {HTMLElement} element - Element to animate
   * @param {number} duration - Animation duration in ms
   * @returns {Promise} Resolves when animation completes
   */
  pulse(element, duration = 1500) {
    if (!this.isAnimationsEnabled) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      element.classList.add('pulse');

      setTimeout(() => {
        element.classList.remove('pulse');
        resolve();
      }, duration);
    });
  }

  /**
   * Glow effect for special states
   * @param {HTMLElement} element - Element to animate
   * @param {number} duration - Animation duration in ms
   * @returns {Promise} Resolves when animation completes
   */
  glow(element, duration = 2000) {
    if (!this.isAnimationsEnabled) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      element.classList.add('glow');

      setTimeout(() => {
        element.classList.remove('glow');
        resolve();
      }, duration);
    });
  }

  /**
   * Stagger animation for multiple elements
   * @param {Array<HTMLElement>} elements - Elements to animate
   * @param {string} animationType - Type of animation ('fadeIn', 'slideIn', 'scaleIn')
   * @param {number} staggerDelay - Delay between elements in ms
   * @param {string} direction - Direction for slideIn
   * @returns {Promise} Resolves when all animations complete
   */
  stagger(
    elements,
    animationType = 'fadeIn',
    staggerDelay = 100,
    direction = 'left'
  ) {
    if (!this.isAnimationsEnabled) {
      elements.forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'translateX(0) translateY(0) scale(1)';
      });
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let completed = 0;
      const total = elements.length;

      if (total === 0) {
        resolve();
        return;
      }

      elements.forEach((element, index) => {
        setTimeout(() => {
          let animationPromise;

          switch (animationType) {
            case 'fadeIn':
              animationPromise = this.fadeIn(element);
              break;
            case 'slideIn':
              animationPromise = this.slideIn(element, direction);
              break;
            case 'scaleIn':
              animationPromise = this.scaleIn(element);
              break;
            default:
              animationPromise = this.fadeIn(element);
          }

          animationPromise.then(() => {
            completed++;
            if (completed === total) {
              resolve();
            }
          });
        }, index * staggerDelay);
      });
    });
  }

  /**
   * Animate element with custom CSS class
   * @param {HTMLElement} element - Element to animate
   * @param {string} className - CSS class to add
   * @param {number} duration - Animation duration in ms
   * @returns {Promise} Resolves when animation completes
   */
  animateWithClass(element, className, duration = 500) {
    if (!this.isAnimationsEnabled) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      element.classList.add(className);

      setTimeout(() => {
        element.classList.remove(className);
        resolve();
      }, duration);
    });
  }

  /**
   * Animate loading state
   * @param {HTMLElement} element - Element to show loading state
   * @param {boolean} isLoading - Whether to show or hide loading
   */
  setLoadingState(element, isLoading) {
    if (isLoading) {
      element.classList.add('loading');
      element.classList.add('pulse');
    } else {
      element.classList.remove('loading');
      element.classList.remove('pulse');
    }
  }

  /**
   * Animate generating state for lore/artwork
   * @param {HTMLElement} element - Element to show generating state
   * @param {boolean} isGenerating - Whether to show or hide generating state
   */
  setGeneratingState(element, isGenerating) {
    if (isGenerating) {
      element.classList.add('generating');
      this.showGenerationProgress(element, 'Initializing...');
    } else {
      element.classList.remove('generating');
      this.hideGenerationProgress(element);
    }
  }

  /**
   * Animate success state
   * @param {HTMLElement} element - Element to animate
   * @returns {Promise} Resolves when animation completes
   */
  animateSuccess(element) {
    return this.animateWithClass(element, 'bounce', 600);
  }

  /**
   * Animate error state
   * @param {HTMLElement} element - Element to animate
   * @returns {Promise} Resolves when animation completes
   */
  animateError(element) {
    return this.animateWithClass(element, 'wiggle', 500);
  }

  /**
   * Animate attention state
   * @param {HTMLElement} element - Element to animate
   * @returns {Promise} Resolves when animation completes
   */
  animateAttention(element) {
    return this.animateWithClass(element, 'glow', 2000);
  }

  /**
   * Queue animation for later execution
   * @param {Function} animationFunction - Animation function to queue
   * @param {Array} args - Arguments for the animation function
   */
  queueAnimation(animationFunction, ...args) {
    this.animationQueue.push({ animationFunction, args });

    if (!this.isProcessingQueue) {
      this.processAnimationQueue();
    }
  }

  /**
   * Process animation queue
   */
  async processAnimationQueue() {
    this.isProcessingQueue = true;

    while (this.animationQueue.length > 0) {
      const { animationFunction, args } = this.animationQueue.shift();
      await animationFunction.apply(this, args);
    }

    this.isProcessingQueue = false;
  }

  /**
   * Clear animation queue
   */
  clearAnimationQueue() {
    this.animationQueue = [];
  }

  /**
   * Get animation duration based on element size
   * @param {HTMLElement} element - Element to get duration for
   * @param {number} baseDuration - Base duration in ms
   * @returns {number} Calculated duration
   */
  getAnimationDuration(element, baseDuration = 300) {
    const rect = element.getBoundingClientRect();
    const area = rect.width * rect.height;

    // Longer duration for larger elements
    if (area > 100000) {
      // Large elements
      return baseDuration * 1.5;
    } else if (area > 50000) {
      // Medium elements
      return baseDuration * 1.2;
    } else {
      // Small elements
      return baseDuration;
    }
  }

  /**
   * Check if element is currently animating
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} True if animating
   */
  isAnimating(element) {
    const computedStyle = window.getComputedStyle(element);
    return (
      computedStyle.transition !== 'none' ||
      computedStyle.animation !== 'none' ||
      element.classList.contains('animated-element')
    );
  }

  /**
   * Stop all animations on element
   * @param {HTMLElement} element - Element to stop animations on
   */
  stopAnimations(element) {
    element.style.transition = 'none';
    element.style.animation = 'none';
    element.classList.remove('animated-element');
  }

  /**
   * Show progress bar for generation
   * @param {HTMLElement} element - Element to add progress bar to
   * @param {string} message - Initial message to display
   */
  showGenerationProgress(element, message = 'Generating...') {
    // Remove existing progress if any
    this.hideGenerationProgress(element);

    const progressContainer = document.createElement('div');
    progressContainer.className = 'generation-progress-container';

    progressContainer.innerHTML = `
      <div class="generation-progress-bar">
        <div class="generation-progress-fill"></div>
      </div>
      <div class="generation-status">${message}</div>
    `;

    element.appendChild(progressContainer);
    element.classList.add('generating-lore');
  }

  /**
   * Update progress bar
   * @param {HTMLElement} element - Element with progress bar
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} message - Status message
   */
  updateGenerationProgress(element, progress, message) {
    const progressFill = element.querySelector('.generation-progress-fill');
    const statusText = element.querySelector('.generation-status');

    if (progressFill) {
      progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }

    if (statusText) {
      statusText.textContent = message;
    }
  }

  /**
   * Hide progress bar
   * @param {HTMLElement} element - Element to remove progress from
   */
  hideGenerationProgress(element) {
    const progressContainer = element.querySelector(
      '.generation-progress-container'
    );
    if (progressContainer) {
      progressContainer.remove();
    }
    element.classList.remove('generating-lore');
  }
}
