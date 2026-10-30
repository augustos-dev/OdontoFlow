// Rode com: SUPABASE_URL=https://x.supabase.co SUPABASE_SERVICE_KEY=k STORAGE_PRIVATE=true npx tsx tests/unit_storage.ts
import { toStoragePath, normalizeAttachmentRef, resolveAttachmentUrls } from '../services/storageService'
let pass = 0, fail = 0
const ok = (n: string, c: boolean, x?: unknown) => { c ? pass++ : fail++; console.log(c ? '  ✔' : '  ✘ FALHOU:', n, c ? '' : JSON.stringify(x)) }
const B = 'https://x.supabase.co/storage/v1/object'
ok('caminho simples fica como está', toStoragePath('T1/A/evolutions/abc.webp') === 'T1/A/evolutions/abc.webp')
ok('URL pública antiga -> caminho', toStoragePath(`${B}/public/odontoflow-uploads/evolutions/abc-Joao_Silva.webp`) === 'evolutions/abc-Joao_Silva.webp')
ok('URL assinada -> caminho (sem o token)', toStoragePath(`${B}/sign/odontoflow-uploads/T1/A/evolutions/abc.webp?token=zzz`) === 'T1/A/evolutions/abc.webp')
ok('URL de terceiros -> null', toStoragePath('https://evil.com/x.png') === null)
ok('anexo do próprio tenant é aceito (e vira caminho no modo privado)', normalizeAttachmentRef('T1/A/evolutions/abc.webp', 'T1') === 'T1/A/evolutions/abc.webp')
ok('formato antigo sem prefixo é aceito', normalizeAttachmentRef(`${B}/public/odontoflow-uploads/evolutions/old.webp`, 'T1') === 'evolutions/old.webp')
ok('arquivo de OUTRO tenant é recusado', normalizeAttachmentRef('T2/A/evolutions/abc.webp', 'T1') === null)
ok('URL de terceiros é recusada', normalizeAttachmentRef('https://evil.com/x.png', 'T1') === null)
ok('path traversal é recusado', normalizeAttachmentRef('T1/../T2/x.webp', 'T1') === null)
ok('valor não-string é recusado', normalizeAttachmentRef({ a: 1 }, 'T1') === null && normalizeAttachmentRef('', 'T1') === null)
// resolveAttachmentUrls com Supabase simulado
import { supabase } from '../config/supabase'
;(supabase.storage as any).from = () => ({ createSignedUrls: async (paths: string[]) => ({ data: paths.map((p) => ({ signedUrl: `SIGNED(${p})` })), error: null }) })
resolveAttachmentUrls(['T1/A/e/1.webp', `${B}/public/odontoflow-uploads/evolutions/old.webp`, `${B}/sign/odontoflow-uploads/T1/x.webp?token=a`, 'https://evil.com/y.png']).then((r) => {
  ok('assina caminho e URL pública antiga; não mexe em URL já assinada nem em externa',
    r[0] === 'SIGNED(T1/A/e/1.webp)' && r[1] === 'SIGNED(evolutions/old.webp)' && r[2].includes('sign/') && r[3] === 'https://evil.com/y.png', r)
  console.log(`=== ${pass} passaram, ${fail} falharam ===`); process.exit(fail ? 1 : 0)
})
