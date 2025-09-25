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
