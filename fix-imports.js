const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const searchStr1 = "await import('@/lib/supabase/client')";
      const searchStr2 = 'await import("@/lib/supabase/client")';
      
      if (content.includes(searchStr1) || content.includes(searchStr2)) {
        // Remove the dynamic import line
        // It matches lines like: const { createBrowserSupabaseClient } = await import('@/lib/supabase/client');
        content = content.replace(/[ \t]*const\s+\{\s*createBrowserSupabaseClient\s*\}\s*=\s*await\s+import\(['"]@\/lib\/supabase\/client['"]\);?\n?/g, '');
        
        const staticImport1 = "import { createBrowserSupabaseClient } from '@/lib/supabase/client';";
        const staticImport2 = 'import { createBrowserSupabaseClient } from "@/lib/supabase/client";';
        
        // Add static import at the top if not exists
        if (!content.includes(staticImport1) && !content.includes(staticImport2)) {
           // Insert after 'use client' if it exists, else at the beginning
           if (content.startsWith("'use client';") || content.startsWith('"use client";')) {
               content = content.replace(/^['"]use client['"];?\n?/, "$&\n" + staticImport1 + "\n");
           } else {
               content = staticImport1 + "\n" + content;
           }
        }
        fs.writeFileSync(fullPath, content);
        console.log('Fixed ' + fullPath);
      }
    }
  }
}

processDir('src');
