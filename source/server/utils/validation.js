/**
 * Schema Validation Utilities
 * 
 * Provides schema validation for Pokémon data and API responses
 * to ensure data integrity and consistency.
 * 
 * @fileoverview Schema validation utilities
 * @author Infinite Pokédex Team
 * @version 1.0.0
 */

/**
 * Validate data against schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Schema definition
 * @returns {Object} Validation result
 */
export function validateSchema(data, schema) {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Check required fields
    if (rules.required && (value === undefined || value === null)) {
      result.valid = false;
      result.errors.push(`Missing required field: ${field}`);
      continue;
    }

    // Skip validation if field is not present and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Check type
    if (rules.type && !checkType(value, rules.type)) {
      result.valid = false;
      result.errors.push(`Field ${field} has invalid type: expected ${rules.type}, got ${typeof value}`);
      continue;
    }

    // Check array length
    if (rules.type === 'array' && rules.maxLength && value.length > rules.maxLength) {
      result.warnings.push(`Field ${field} exceeds maximum length: ${value.length} > ${rules.maxLength}`);
    }

    // Check string length
    if (rules.type === 'string' && rules.maxLength && value.length > rules.maxLength) {
      result.warnings.push(`Field ${field} exceeds maximum length: ${value.length} > ${rules.maxLength}`);
    }

    // Check numeric bounds
    if (rules.type === 'number' && rules.min !== undefined && value < rules.min) {
      result.warnings.push(`Field ${field} below minimum value: ${value} < ${rules.min}`);
    }

    if (rules.type === 'number' && rules.max !== undefined && value > rules.max) {
      result.warnings.push(`Field ${field} above maximum value: ${value} > ${rules.max}`);
    }
  }

  return result;
}

/**
 * Check if value matches expected type
 * @param {*} value - Value to check
 * @param {string} expectedType - Expected type
 * @returns {boolean} True if type matches
 */
function checkType(value, expectedType) {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return true;
  }
}

/**
 * Validate Pokémon species data
 * @param {Object} species - Species data
 * @returns {Object} Validation result
 */
export function validateSpecies(species) {
  const schema = {
    id: { type: 'number', required: true, min: 1, max: 10000 },
    name: { type: 'string', required: true, maxLength: 50 },
    types: { type: 'array', required: true, maxLength: 2 },
    height_m: { type: 'number', min: 0, max: 20 },
    weight_kg: { type: 'number', min: 0, max: 10000 },
    abilities: { type: 'array', maxLength: 10 },
    moves: { type: 'array', maxLength: 512 },
    tidbits: { type: 'array', maxLength: 10 },
    sources: { type: 'object', required: true }
  };

  return validateSchema(species, schema);
}

/**
 * Validate tidbit data
 * @param {Object} tidbit - Tidbit data
 * @returns {Object} Validation result
 */
export function validateTidbit(tidbit) {
  const schema = {
    title: { type: 'string', required: true, maxLength: 100 },
    body: { type: 'string', required: true, maxLength: 500 },
    sourceRefs: { type: 'array', maxLength: 5 },
    quality: { type: 'object' }
  };

  return validateSchema(tidbit, schema);
}

/**
 * Validate dataset metadata
 * @param {Object} metadata - Dataset metadata
 * @returns {Object} Validation result
 */
export function validateMetadata(metadata) {
  const schema = {
    totalSpecies: { type: 'number', required: true, min: 0 },
    totalTidbits: { type: 'number', min: 0 },
    sources: { type: 'array' },
    contentHash: { type: 'string', required: true }
  };

  return validateSchema(metadata, schema);
}

/**
 * Sanitize text content
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[^\w\s\-.,!?]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate content hash
 * @param {string} hash - Hash to validate
 * @returns {boolean} True if valid hash
 */
export function validateHash(hash) {
  const hashRegex = /^[a-f0-9]{64}$/; // SHA-256 hash
  return hashRegex.test(hash);
}

/**
 * Validate version string
 * @param {string} version - Version to validate
 * @returns {boolean} True if valid version
 */
export function validateVersion(version) {
  const versionRegex = /^\d{8}-\d{4}$/; // YYYYMMDD-HHMM format
  return versionRegex.test(version);
}