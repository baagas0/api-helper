export function convertJsonToTs(json, interfaceName = "Root") {
  try {
    return parseObject(json, interfaceName);
  }
  catch (error) {
    if (error instanceof Error &&
      error.message.startsWith("Circular reference detected")) {
      throw error; // Re-throw circular reference errors directly
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error converting JSON to TypeScript: ${errorMessage}`);
  }
}
function determineType(value, parentName = "", key = "", seen = new Set()) {
  if (Array.isArray(value)) {
    if (value.length === 0)
      return "any[]"; // Explicitly handle empty arrays
    const elementType = determineType(value[0] || "any", parentName, key, seen); // Determine type of first element
    return `Array<${elementType}>`;
  }
  else if (value === null || value === undefined) {
    return "any"; // Null or undefined maps to `any`
  }
  else if (typeof value === "string" && isISODate(value)) {
    return "Date"; // ISO date strings map to `Date`
  }
  else if (typeof value === "object") {
    // Instead of returning a generic "object", we'll create an inline type
    if (seen.has(value)) {
      return "any"; // Break circular references with 'any'
    }
    
    // For nested objects, we create an inline type definition
    const nestedType = parseInlineObject(value, parentName, key, seen);
    return nestedType;
  }
  return typeof value; // Fallback to primitive JavaScript types
}
function isISODate(value) {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  return isoDateRegex.test(value);
}
function pluralToSingular(name) {
  if (name.endsWith("ies"))
    return name.slice(0, -3) + "y";
  if (name.endsWith("s"))
    return name.slice(0, -1);
  return name;
}
function capitalize(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
function formatInlineObject(obj, optionalKeys = []) {
  if (!obj || typeof obj !== 'object') return '{}';
  
  const entries = Object.entries(obj)
    .map(([key, value]) => {
      const optionalModifier = optionalKeys.includes(key) ? '?' : '';
      // Add quotes around keys containing hyphens
      const formattedKey = key.includes('-') ? `'${key}'` : key;
      return `${formattedKey}${optionalModifier}: ${value}`;
    })
    .join('; ');
  
  return `{ ${entries} }`;
}

function formatKeysToOptional(content, optionalKeys) {
  let result = JSON.stringify(content, null, 2)
    .replace(/"/g, "")
    .replace(/,/g, "");
  
  Object.keys(content).forEach((key) => {
    // Format key with quotes if it contains a hyphen
    const formattedKey = key.includes('-') ? `'${key}'` : key;
    const keyRegex = new RegExp(`${key}:`, "g");
    
    result = optionalKeys.includes(key)
      ? result.replace(keyRegex, `${formattedKey}?:`)
      : result.replace(keyRegex, `${formattedKey}:`);
  });
  
  return result;
}

function parseInlineObject(obj, parentName = "", key = "", seen = new Set()) {
  const newSeen = new Set(seen);
  newSeen.add(obj);
  
  const optionalKeys = [];
  const fields = {};
  
  Object.entries(obj).forEach(([fieldKey, fieldValue]) => {
    if (fieldValue === null || fieldValue === undefined) {
      optionalKeys.push(fieldKey);
    }
    
    // Generate a type for this field
    fields[fieldKey] = determineType(fieldValue, parentName, fieldKey, newSeen);
  });
  
  return formatInlineObject(fields, optionalKeys);
}

function parseObject(obj, interfaceName = "Root", seen = new Set()) {
  if (seen.has(obj)) {
    throw new Error(`Circular reference detected in ${interfaceName}`);
  }
  
  const newSeen = new Set(seen);
  newSeen.add(obj);
  
  const optionalKeys = [];
  const fields = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      optionalKeys.push(key);
    }
    
    // Use the updated determineType to get inline type definitions
    fields[key] = determineType(value, interfaceName, key, newSeen) + ';';
  });
  
  const formattedContent = formatKeysToOptional(fields, optionalKeys);
  return `interface ${interfaceName} ${formattedContent}`;
}
