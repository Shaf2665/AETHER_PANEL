/**
 * Color Validator Utility
 * Validates hex colors and gradient color structures
 */

/**
 * Validate hex color format (#RRGGBB)
 * @param {string} color - The hex color to validate
 * @returns {boolean} - True if valid hex color, false otherwise
 */
function validateHexColor(color) {
  if (!color || typeof color !== 'string') {
    return false;
  }
  
  // Match hex color pattern: # followed by 6 hexadecimal digits
  const hexPattern = /^#([A-Fa-f0-9]{6})$/;
  return hexPattern.test(color.trim());
}

/**
 * Validate gradient colors structure
 * @param {object} colors - The gradient colors object {color1, color2}
 * @returns {object} - {valid: boolean, sanitized: object|null, error: string|null}
 */
function validateGradientColors(colors) {
  if (!colors || typeof colors !== 'object') {
    return {
      valid: false,
      sanitized: null,
      error: 'Gradient colors must be an object',
    };
  }
  
  const { color1, color2 } = colors;
  
  if (!color1 || !color2) {
    return {
      valid: false,
      sanitized: null,
      error: 'Both color1 and color2 are required',
    };
  }
  
  if (!validateHexColor(color1)) {
    return {
      valid: false,
      sanitized: null,
      error: 'color1 must be a valid hex color (#RRGGBB)',
    };
  }
  
  if (!validateHexColor(color2)) {
    return {
      valid: false,
      sanitized: null,
      error: 'color2 must be a valid hex color (#RRGGBB)',
    };
  }
  
  // Return sanitized colors (uppercase hex)
  return {
    valid: true,
    sanitized: {
      color1: color1.trim().toUpperCase(),
      color2: color2.trim().toUpperCase(),
    },
    error: null,
  };
}

/**
 * Sanitize hex color - returns valid hex or default
 * @param {string} color - The color to sanitize
 * @param {string} defaultColor - Default color if invalid (default: '#3b82f6')
 * @returns {string} - Valid hex color
 */
function sanitizeHexColor(color, defaultColor = '#3b82f6') {
  if (validateHexColor(color)) {
    return color.trim().toUpperCase();
  }
  return validateHexColor(defaultColor) ? defaultColor.toUpperCase() : '#3B82F6';
}

/**
 * Sanitize gradient colors - returns valid gradient or default
 * @param {object} colors - The gradient colors to sanitize
 * @param {object} defaultColors - Default colors if invalid
 * @returns {object} - Valid gradient colors object
 */
function sanitizeGradientColors(colors, defaultColors = { color1: '#3b82f6', color2: '#06b6d4' }) {
  const validation = validateGradientColors(colors);
  if (validation.valid) {
    return validation.sanitized;
  }
  
  // Return default colors if provided and valid
  const defaultValidation = validateGradientColors(defaultColors);
  if (defaultValidation.valid) {
    return defaultValidation.sanitized;
  }
  
  // Fallback to hardcoded defaults
  return { color1: '#3B82F6', color2: '#06B6D4' };
}

module.exports = {
  validateHexColor,
  validateGradientColors,
  sanitizeHexColor,
  sanitizeGradientColors,
};

