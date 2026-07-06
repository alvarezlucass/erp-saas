const fs = require('fs');
let content = fs.readFileSync('src/pages/SuperAdminPage.tsx', 'utf8');

content = content.replace(
  /useState<'empresas' \| 'staging'>\('empresas'\)/,
  "useState<'empresas' | 'staging' | 'saas'>('empresas')"
);

content = content.replace(
  /import \{ toast \} from 'sonner'/,
  "import { toast } from 'sonner'\nimport { SaasPackagingTab } from '../components/SaasPackagingTab'"
);

const tabButton = `
              <button
                onClick={() => setActiveTab('saas')}
                className={\`px-4 py-2 rounded-lg text-sm font-bold transition-all \${
                  activeTab === 'saas' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }\`}
              >
                SaaS Packaging
              </button>
`;

content = content.replace(
  /<button\s*onClick=\{\(\) => setActiveTab\('staging'\)\}[\s\S]*?<\/button>/,
  match => match + "\n" + tabButton
);

const tabRender = `
        {activeTab === 'saas' && (
          <SaasPackagingTab />
        )}
`;

content = content.replace(
  /\{activeTab === 'staging' && \(/,
  tabRender + "\n        {activeTab === 'staging' && ("
);

// We should also replace the PLANES hardcoded array inside SuperAdminPage with saasPlanes query
const planesQuery = `
  const { data: saasPlanes = [] } = useQuery({
    queryKey: ['saasPlanes'],
    queryFn: saasApi.getPlanes
  })
`;

// wait, if we replace PLANES, we need to import saasApi
content = content.replace(
  /import \{ SaasPackagingTab \} from '\.\.\/components\/SaasPackagingTab'/,
  "import { SaasPackagingTab } from '../components/SaasPackagingTab'\nimport { saasApi } from '../lib/api'"
);

// We need to inject the useQuery somewhere after `const { data: empresas = [], isLoading } = useQuery(...)`
content = content.replace(
  /const \{ data: empresas = \[\], isLoading \} = useQuery\(\{[\s\S]*?\}\)/,
  match => match + "\n" + planesQuery
);

fs.writeFileSync('src/pages/SuperAdminPage.tsx', content);
console.log('SuperAdminPage tabs updated');
