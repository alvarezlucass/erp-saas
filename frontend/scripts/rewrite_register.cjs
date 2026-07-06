const fs = require('fs');
let content = fs.readFileSync('src/pages/RegisterPage.tsx', 'utf8');

// 1. Add imports
content = content.replace(
  /import { authApi } from '\.\.\/lib\/api'/, 
  "import { authApi, saasApi } from '../lib/api'\nimport { useQuery } from '@tanstack/react-query'"
);

// 2. Remove PLANES constant
content = content.replace(/const PLANES: Record<string, \{[\s\S]*?\}\n\n/, '');

// 3. Update RegisterPage component to fetch plans
const queryCode = `
  const { data: planesData = [], isLoading: loadingPlanes } = useQuery({
    queryKey: ['saasPlanes'],
    queryFn: saasApi.getPlanes
  })
  
  const selectedPlanData = planesData.find((p: any) => p.id === selectedPlan) || planesData[1] || planesData[0] || {}
`;

content = content.replace(
  /export function RegisterPage\(\) \{\n/,
  "export function RegisterPage() {\n" + queryCode + "\n"
);

// 4. Fix calculations
content = content.replace(
  /const precioListaTotal = PLANES\[selectedPlan\]\?\.precio \|\| 0/,
  "const precioListaTotal = selectedPlanData?.precioMensual || 0"
);

// 5. Fix form submission
content = content.replace(
  /modulos: PLANES\[selectedPlan\]\.modulosTecnicos,/,
  "modulos: selectedPlanData?.modulos || ['COMERCIAL'],"
);

// 6. Fix Map
content = content.replace(
  /\{Object\.entries\(PLANES\)\.map\(\(\[key, item\]\) => \{/,
  "{planesData.map((item: any) => {\n                      const key = item.id"
);

// 7. Fix UI usages
content = content.replace(
  /<p className=\"text-\[10px\] text-gray-400 font-bold mb-6\">\n\s*\{item\.descripcion\}\n\s*<\/p>/,
  '<p className="text-[10px] text-gray-400 font-bold mb-6">Hasta {item.usuariosBase} usuarios · {item.tiempoRespuesta}</p>'
);

content = content.replace(
  /\{item\.caracteristicas\.map\(\(carac, i\) => \(/g,
  "{(item.modulos || []).slice(0,5).map((carac: string, i: number) => ("
);

content = content.replace(
  /<span className=\"text-white font-bold\">\{PLANES\[selectedPlan\]\.nombre\}<\/span>/g,
  '<span className="text-white font-bold">{selectedPlanData?.nombre}</span>'
);

content = content.replace(
  /\{item\.precio\}/g,
  "{item.precioMensual}"
);

fs.writeFileSync('src/pages/RegisterPage.tsx', content);
console.log('RegisterPage.tsx updated successfully.');
