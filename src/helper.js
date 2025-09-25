export const baseCode = `
interface EssenceResponse {
  horoscope: string;
  zodiac: string;
  bazi_bone_weight: number;
  bone_physiognomy: string;
  mahabote_house: string;
  mahabote_planet: string;
}

export interface EssenceData {
  horoscope: string;
  zodiac: string;
  baziBoneWeight: number;
  bonePhysiognomy: string;
  mahaboteHouse: string;
  mahabotePlanet: string;
}
const getEssence = async (): Promise<EssenceData> => {
  try {
    const res: CoreHttpResponse<EssenceResponse> = await coreHttps.get(
      "/m/prediction/soul-essence"
    );
    return {
      horoscope: res.data.horoscope,
      zodiac: res.data.zodiac,
      baziBoneWeight: res.data.bazi_bone_weight,
      bonePhysiognomy: res.data.bone_physiognomy,
      mahaboteHouse: res.data.mahabote_house,
      mahabotePlanet: res.data.mahabote_planet,
    };
  } catch (error: unknown) {
    throw error;
  }
};
`
export function parseCurl(curlCommand) {
  const lines = curlCommand
    .trim()
    .split("\n")
    .map((line) => line.trim());
  const fullCommand = lines.join(" ").replace(/\\\s+/g, " ");

  let url = "";
  let method = "GET";
  const headers = {};
  let data = null;

  // Extract URL
  const urlMatch = fullCommand.match(/'(https?:\/\/[^']+)'/);
  if (urlMatch) {
    url = urlMatch[1];
  }

  // Extract method
  const methodMatch = fullCommand.match(/--request\s+(\w+)/i);
  if (methodMatch) {
    method = methodMatch[1].toUpperCase();
  }

  // Extract headers
  const headerMatches = fullCommand.matchAll(/--header\s+["']([^"']+)["']/g);
  for (const match of headerMatches) {
    const [key, value] = match[1].split(":").map((s) => s.trim());
    if (key && value) {
      headers[key] = value;
    }
  }

  // Extract data
  const dataMatch = fullCommand.match(/--data(?:-raw)?\s+'([\s\S]*?)'/);
  if (dataMatch) {
    try {
      data = JSON.parse(dataMatch[1]);
    } catch (e) {
      data = dataMatch[1];
    }
  }

  return { url, method, headers, data };
}

export async function makeRequest(parsedCurl) {
  const { url, method, headers, data } = parsedCurl;

  const fetchOptions = {
    method,
    headers,
  };

  if (data && ["POST", "PUT", "PATCH"].includes(method)) {
    fetchOptions.body = typeof data === "string" ? data : JSON.stringify(data);
  }

  try {
    const response = await fetch(url, fetchOptions);
    const responseData = await response.text();

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseData);
    } catch (e) {
      parsedResponse = responseData;
    }

    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: parsedResponse,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generates mapping code from snake_case API response to camelCase properties
 * @param {Object} data - The API response data object with snake_case keys
 * @param {string} prefix - The object prefix in the code (e.g., "res.data")
 * @returns {string} - Code that maps snake_case to camelCase properties
 */
/**
 * Generates mapping code from snake_case API response to camelCase properties
 * with proper indentation
 * 
 * @param {Object} data - The API response data object with snake_case keys
 * @param {string} prefix - The object prefix in the code (e.g., "res.data")
 * @param {number} indentLevel - Base indentation level for the generated code
 * @returns {string} - Code that maps snake_case to camelCase properties with proper indentation
 */
export function generateSnakeToCamelMapping(data, prefix = "res?.data", indentLevel = 0) {
  if (!data || typeof data !== 'object') return '';
  
  // Create indentation strings based on level
  const baseIndent = '  '.repeat(indentLevel);
  const propIndent = '  '.repeat(indentLevel + 1);
  const nestedIndent = '  '.repeat(indentLevel + 2);
  
  // For arrays, use the first item as a template if it exists
  if (Array.isArray(data)) {
  if (data.length === 0) return '';
  
  // Check if array contains primitive values
  if (data[0] === null || 
      typeof data[0] !== 'object' || 
      data[0] instanceof Date) {
    // For primitive arrays, just reference the array directly
    return `${prefix}`;
  }
  
  // For arrays of objects, generate a map function
  return `${prefix}?.map(item => ({
${generateSnakeToCamelMapping(data[0], "item", indentLevel + 1)}
${baseIndent}}))`;
}
  
  // Process object properties
  const mappings = Object.keys(data).map(key => {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    
    // Handle nested objects recursively
    if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
      return `${camelKey}: {
${generateSnakeToCamelMapping(data[key], `${prefix}?.${key}`, indentLevel + 2)}
${propIndent}}`;
    } 
    // Handle arrays
    else if (Array.isArray(data[key]) && data[key].length > 0) {
      return `${camelKey}: ${generateSnakeToCamelMapping(data[key], `${prefix}?.${key}`, indentLevel)}`;
    }
    // Simple property mapping
    else {
      return `${camelKey}: ${prefix}?.${key}`;
    }
  });
  
  return mappings.map(mapping => `${propIndent}${mapping}`).join(',\n');
}