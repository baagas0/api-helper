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
            <label>Nama Fungsi</label>
            <input v-model="fnName" placeholder="mis. fetchReports" />
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
          <pre>{{ baseCode }}</pre>
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
        
        <pre>{{ resultCode }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
// import { convertJsonToTs } from '@typeweaver/json2ts';
import { ref } from "vue";
import { makeRequest, parseCurl, baseCode } from "./helper";
import { lowerCase, pascalCase } from 'text-case';
import jcc from 'json-case-convertor';
import { convertJsonToTs } from "./toInterface";


const fnName = ref("essence");
const curlCommand = ref(`curl --location --request POST 'http://192.168.1.106:8888/api/prediction/tarot' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.U2FsdGVkX18e9/Fh1z3PjIlV2nmNy23Lut6x5dZDETomNkF6bB80dhCFKVXvb7XP/ClDWadOTkDmXUocpEFmIJxjEf+gPODwnu/+91/Zpa/0PMQ3sRAUpOp/E5bKm1RFOfuP9H4JTDWMs26BcLQ2bEpOpzECt3TPShNPJVemsoswZfFkdWPDRZ+vVPRMxkKmoD8cF5uMP07SWHcBC0Iv+RTLHkYHkssC6N60rdm6GsJp//Hk7Audq0cpJ6PJx6flS71Tm546jJL4XduVWw4WlY2RnxjIhrFi2Vng2aA2MiN4O5XXspKgUJogbTtgitZ2.4PYaXiL5loB5rvAoRnsKlpjkxG9Uetrkgra2SPFaaD4' \
--data '{
    "question":"halo apa kabar?",
    "shuffled_amount":1,
    "lang":"en-US"
}'`);
const status = ref({ text: "", success: false, error: false, loading: false });
const loading = ref(false);

const result = ref("// Response akan muncul di sini setelah submit");
const resultCode = ref("");

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
      const interfacePayload = convertJsonToTs(jcc.camelCaseKeys(parsedCurl.data), title + "Payload");
      const interfaceResponse = convertJsonToTs(res.data.data, title + "Response");
      const interfaceReturn = convertJsonToTs(jcc.camelCaseKeys(res.data.data), title);
      const method = lowerCase(parsedCurl.method || "get");
      const url = parsedCurl.url.split('api')[1];
      const baseFunc = `
const ${method}${title} = async (): Promise<${title}> => {
  try {
    const res: CoreHttpResponse<${title + "Response"}> = await coreHttps.get(
      "/m${url}"
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

      `;
      resultCode.value = `${interfacePayload}\nexport ${interfaceResponse}\nexport ${interfaceReturn}\n\n${baseFunc}`;
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
</style>