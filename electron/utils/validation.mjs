/**
 * Input validation utilities for IPC handlers
 * Provides secure validation for all data coming from renderer process
 */

/**
 * Get default allowed origins based on environment
 * @returns {string[]} Array of allowed origins
 */
function getDefaultAllowedOrigins() {
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL;
  const isPackaged = process.env.APP_PACKAGED === 'true' || process.env.NODE_ENV === 'production';
  
  const baseOrigins = [
    'https://accounts.google.com',
    'https://oauth2.googleapis.com'
  ];
  
  if (isDevelopment && !isPackaged) {
    return [
      ...baseOrigins,
      'http://127.0.0.1:8080',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://localhost:3000'
    ];
  }
  
  // For production, add production domains
  const productionOrigins = process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : [];
  
  return [...baseOrigins, ...productionOrigins];
}

/**
 * Validates that a value is a non-empty string
 * @param {any} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {number} maxLength - Maximum allowed length (default: 1000)
 * @returns {string} - The validated string
 * @throws {Error} - If validation fails
 */
export function validateString(value, fieldName, maxLength = 1000) {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  
  if (value.length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
  
  if (value.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }
  
  return value;
}

/**
 * Validates that a value is a valid URL
 * @param {any} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {string[]} allowedOrigins - Array of allowed origins (default: environment-aware)
 * @returns {string} - The validated URL
 * @throws {Error} - If validation fails
 */
export function validateUrl(value, fieldName, allowedOrigins = getDefaultAllowedOrigins()) {
  const url = validateString(value, fieldName, 2000);
  
  try {
    const urlObj = new URL(url);
    
    // Check if the origin is allowed
    const origin = `${urlObj.protocol}//${urlObj.host}`;
    if (!allowedOrigins.includes(origin)) {
      throw new Error(`${fieldName} must be from an allowed origin: ${allowedOrigins.join(', ')}`);
    }
    
    return url;
  } catch (error) {
    if (error.message.includes('must be from an allowed origin')) {
      throw error;
    }
    throw new Error(`${fieldName} must be a valid URL`);
  }
}

/**
 * Validates that a value is a valid JWT token format
 * @param {any} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {string} - The validated token
 * @throws {Error} - If validation fails
 */
export function validateJwtToken(value, fieldName) {
  const token = validateString(value, fieldName, 2000);
  
  // Basic JWT format validation (3 parts separated by dots)
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error(`${fieldName} must be a valid JWT token format`);
  }
  
  // Check that each part is base64-like (basic validation)
  for (let i = 0; i < parts.length; i++) {
    if (!/^[A-Za-z0-9_-]+$/.test(parts[i])) {
      throw new Error(`${fieldName} contains invalid characters`);
    }
  }
  
  return token;
}

/**
 * Validates that a value is a valid permission type
 * @param {any} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {string[]} allowedTypes - Array of allowed permission types
 * @returns {string} - The validated permission type
 * @throws {Error} - If validation fails
 */
export function validatePermissionType(value, fieldName, allowedTypes = ['microphone', 'camera', 'screen', 'notifications']) {
  const permissionType = validateString(value, fieldName, 50);
  
  if (!allowedTypes.includes(permissionType)) {
    throw new Error(`${fieldName} must be one of: ${allowedTypes.join(', ')}`);
  }
  
  return permissionType;
}

/**
 * Validates that a value is a valid boolean
 * @param {any} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {boolean} - The validated boolean
 * @throws {Error} - If validation fails
 */
export function validateBoolean(value, fieldName) {
  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean`);
  }
  
  return value;
}

/**
 * Validates that a value is a valid number within a range
 * @param {any} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} - The validated number
 * @throws {Error} - If validation fails
 */
export function validateNumber(value, fieldName, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  
  if (value < min || value > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
  
  return value;
}

/**
 * Validates that a value is a valid object with required properties
 * @param {any} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {string[]} requiredProperties - Array of required property names
 * @param {number} maxProperties - Maximum number of properties allowed
 * @returns {object} - The validated object
 * @throws {Error} - If validation fails
 */
export function validateObject(value, fieldName, requiredProperties = [], maxProperties = 20) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object`);
  }
  
  const keys = Object.keys(value);
  
  if (keys.length > maxProperties) {
    throw new Error(`${fieldName} exceeds maximum number of properties (${maxProperties})`);
  }
  
  for (const prop of requiredProperties) {
    if (!(prop in value)) {
      throw new Error(`${fieldName} must contain required property: ${prop}`);
    }
  }
  
  return value;
}

/**
 * Validates that a value is a valid array with length constraints
 * @param {any} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {number} maxLength - Maximum array length
 * @returns {Array} - The validated array
 * @throws {Error} - If validation fails
 */
export function validateArray(value, fieldName, maxLength = 100) {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }
  
  if (value.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} items`);
  }
  
  return value;
}

/**
 * Sanitizes a string by removing potentially dangerous characters
 * @param {string} value - The string to sanitize
 * @param {string} fieldName - Name of the field for error messages
 * @returns {string} - The sanitized string
 */
export function sanitizeString(value, fieldName) {
  const sanitized = validateString(value, fieldName);
  
  // Remove potentially dangerous characters
  return sanitized
    .replace(/[<>\"'&]/g, '') // Remove HTML/XML special characters
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim();
}
