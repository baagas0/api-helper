<template>
  <div class="wrap">
    <h1 style="margin:0 0 10px 0">
      API Helper <span class="pill">CURL Tester</span>
    </h1>
    <p class="muted">Masukkan nama fungsi dan perintah CURL untuk menguji API endpoint.</p>

    <div class="card grid grid-2">
      <!-- Left Side -->
      <div class="grid" style="align-content:start">
        <div class="grid">
          <div>
            <div class="checkbox-container">
              <label>
                <input type="checkbox" v-model="fullCode" />
                Full code?
              </label>
            </div>
          </div>
          <div class="row">
            <div>
              <label>Nama Fungsi</label>
              <input v-model="fnName" placeholder="mis. fetchReports" />
            </div>
            
          </div>
          <div>
            <label>CURL Command</label>
            <textarea
              v-model="curlCommand"
              @keydown.ctrl.enter.prevent="handleSubmit"
            />
          </div>
        </div>

        <div>
          <button class="btn" :disabled="loading" @click="handleSubmit">
            {{ loading ? "Loading..." : "Submit" }}
          </button>
          <button 
            v-if="resultCode" 
            class="btn secondary" 
            @click="downloadCode"
          >
            <span class="material-icons">download</span> Download
          </button>
        </div>
      </div>

      <!-- Right Side -->
      <div class="grid">
        <div class="inline" style="justify-content:space-between">
          <h3 style="margin:0">API Response</h3>
          <div
            id="status"
            class="pill"
            :class="{
              success: status.success,
              error: status.error,
              loading: status.loading
            }"
          >
            {{ status.text }}
          </div>
        </div>
        <pre class="code" style="height: 100px;">{{ result }}</pre>
        <div v-if="resultCode"  class="inline" style="justify-content:space-between">
          <h3 style="margin:0">Generated Code</h3>
        </div>
        <pre v-if="resultCode"  class="code">{{ resultCode }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
// import { convertJsonToTs } from '@typeweaver/json2ts';
import { ref } from "vue";
import { makeRequest, parseCurl, baseCode, generateSnakeToCamelMapping } from "./helper";
import { camelCase, lowerCase, pascalCase } from 'text-case';
import jcc from 'json-case-convertor';
import { convertJsonToTs } from "./toInterface";


const fnName = ref("essence");
const curlCommand = ref(`curl --location --request POST 'http://192.168.1.106:8888/api/prediction/tarot' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer asdasd' \
--data '{
    "question":"halo apa kabar?",
    "shuffled_amount":1,
    "lang":"en-US"
}'`);
const status = ref({ text: "", success: false, error: false, loading: false });
const loading = ref(false);

const fullCode = ref(true);
const result = ref("// Response akan muncul di sini setelah submit");
const resultCode = ref("");
const generatedTitle = ref("");

async function handleSubmit() {
  if (!curlCommand.value) {
    alert("Please enter a CURL command");
    return;
  }

  loading.value = true;
  status.value = { text: "Processing...", loading: true };
  result.value = "Making request...";

  try {
    const parsedCurl = parseCurl(curlCommand.value);
    const res = await makeRequest(parsedCurl);

    if (res.success) {
      status.value = {
        text: `${res.status} ${res.statusText}`,
        success: true,
      };
      result.value = JSON.stringify({
        function: fnName.value || "untitled",
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
        data: res.data,
      }, null, 2);
      console.log(parsedCurl);

      const title = pascalCase(fnName.value || "untitled");
      generatedTitle.value = title; // Save the title for download filename
      // const isHavePayload = parsedCurl.data && Object.keys(parsedCurl.data).length > 0;

      const method = lowerCase(parsedCurl.method || "get");
      let payloadData = {};
      let isHavePayload = false;

      if (method === "get") {
        // Extract URL parameters for GET requests
        const urlObj = new URL(parsedCurl.url);
        const params = Object.fromEntries(urlObj.searchParams.entries());
        
        if (Object.keys(params).length > 0) {
          payloadData = params;
          isHavePayload = true;
        }
      } else {
        // For non-GET requests, use the request body
        isHavePayload = parsedCurl.data && Object.keys(parsedCurl.data).length > 0;
        if (isHavePayload) {
          payloadData = parsedCurl.data;
        }
      }

      const interfacePayload = isHavePayload ? convertJsonToTs(jcc.camelCaseKeys(payloadData), title + "Payload") : '';
      const interfaceResponse = convertJsonToTs(res.data.data, title + "Response");
      const interfaceReturn = convertJsonToTs(jcc.camelCaseKeys(res.data.data), title);
      const url = parsedCurl.url.split('api')[1];
      const mappingCode = generateSnakeToCamelMapping(res.data.data, "res.data", 3);

      const baseFunc = `
${fullCode.value ? "import coreHttps, { CoreHttpResponse } from '@/https/core';" : ''}

${interfacePayload}

export ${interfaceResponse}

export ${interfaceReturn}

const ${method}${title} = async (${isHavePayload ? `payload: ${title}Payload` : ''}): Promise<${title}> => {
  try {
    const res: CoreHttpResponse<${title + "Response"}> = await coreHttps.${method}(
      "/m${url}",
      ${isHavePayload ? 'payload' : ''},
    );
    return {
${mappingCode}
    };
  } catch (error: unknown) {
    throw error;
  }
};

const ${title}Api = {
  ${method}${title}
};

export default ${title}Api;

`;
      resultCode.value = `${baseFunc}`;
    } else {
      status.value = { text: "Error", error: true };
      result.value = JSON.stringify(
        {
          function: fnName.value || "untitled",
          error: res.error,
        },
        null,
        2
      );
    }
  } finally {
    loading.value = false;
  }
}

/**
 * Downloads the generated code as a TypeScript file
 */
function downloadCode() {
  if (!resultCode.value) return;
  
  const fileName = `${camelCase(fnName.value || 'untitled')}.ts`;
  const fileContent = resultCode.value;
  
  // Create a blob with the file content
  const blob = new Blob([fileContent], { type: 'text/typescript' });
  const url = URL.createObjectURL(blob);
  
  // Create a download link and trigger it
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  URL.revokeObjectURL(url);
  document.body.removeChild(link);
}
</script>

<style scoped>
/* keep your original CSS */
:root { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial; }
body { margin: 0; background: #0b1020; color: #e6e9f2; }
.wrap { max-width: 1100px; margin: 24px auto; padding: 0 16px; }
.card { background: #0f1630; border: 1px solid #1e2a52; border-radius: 16px; padding: 20px; box-shadow: 0 6px 30px rgba(0,0,0,.25); }
.grid { display: grid; gap: 16px; }
@media (min-width: 900px){ .grid-2 { grid-template-columns: 1fr 1fr; } }
label { font-size: 13px; color: #92a0d1; letter-spacing: .2px; }
input, select, textarea { width: 100%; box-sizing: border-box; background: #0b1226; border: 1px solid #233362; color: #e6e9f2; padding: 10px 12px; border-radius: 12px; outline: none; }
textarea { resize: vertical; min-height: 150px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12.5px; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.btn { appearance: none; border: 1px solid #2b3e78; background: linear-gradient(180deg,#223368,#1a2a56); color: #fff; padding: 10px 14px; border-radius: 12px; cursor: pointer; font-weight: 600; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn.secondary { background: transparent; }
.kbd { font-family: ui-monospace, monospace; background: #0b1226; border: 1px solid #233362; padding: 1px 6px; border-radius: 6px; }
.muted { color: #9fb0e6; font-size: 12px; }
.code { background: #0a0f1f; border: 1px solid #223061; border-radius: 12px; padding: 12px; overflow: auto; max-height: 60vh; white-space: pre-wrap; word-break: break-word; }
.pill { display: inline-block; padding: 4px 8px; border-radius: 999px; font-size: 11px; border: 1px solid #2b3e78; background: #0b1226; color: #c4d0ff; }
.inline { display: inline-flex; align-items: center; gap: 8px; }
.loading { opacity: 0.7; }
.error { color: #ff6b6b; }
.success { color: #51cf66; }
.material-icons { font-size: 16px; vertical-align: middle; margin-right: 4px; }
.checkbox-container {
  display: flex;
  align-items: center;
  margin-top: 20px;
}

.checkbox-container input[type="checkbox"] {
  width: auto;
  margin-right: 6px;
}

.checkbox-container label {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #e6e9f2;
  font-size: 14px;
}
</style>