/**
 * Utility functions for pagination validation
 */

/**
 * Validates and normalizes pagination parameters
 * @param {number|string} limit - Requested limit
 * @param {number|string} offset - Requested offset
 * @param {number} maxLimit - Maximum allowed limit (default: 100)
 * @param {number} defaultLimit - Default limit if not provided (default: 50)
 * @returns {{limit: number, offset: number}} Normalized pagination parameters
 */
function validatePagination(limit, offset, maxLimit = 100, defaultLimit = 50) {
  // Validate and limit pagination parameters to prevent DoS
  const validatedLimit = Math.min(Math.max(parseInt(limit) || defaultLimit, 1), maxLimit);
  const validatedOffset = Math.max(parseInt(offset) || 0, 0);
  
  return {
    limit: validatedLimit,
    offset: validatedOffset,
  };
}

module.exports = {
  validatePagination,
};

