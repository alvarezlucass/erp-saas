const fs = require('fs');
let content = fs.readFileSync('src/pages/SuperAdminPage.tsx', 'utf8');

// The editForm has 'modulos'. In updateMut, we can map the plan to its modulos.
const handleSaveEditCode = `
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaEditando) return
    const planElegido = saasPlanes.find((p: any) => p.id === editForm.plan)
    const dataToSend = {
      ...editForm,
      modulos: planElegido ? planElegido.modulos : editForm.modulos
    }
    updateMut.mutate({ id: empresaEditando.id, data: dataToSend })
  }
`;

content = content.replace(
  /const handleSaveEdit = \(e: React\.FormEvent\) => \{\n\s*e\.preventDefault\(\)\n\s*if \(\!empresaEditando\) return\n\s*updateMut\.mutate\(\{ id: empresaEditando\.id, data: editForm \}\)\n\s*\}/,
  handleSaveEditCode
);

// For onboard (Alta), the user selects a plan.
const handleAltaSubmitCode = `
  const handleAltaSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const planElegido = saasPlanes.find((p: any) => p.id === nuevo.empresa.plan)
    const payload = {
      ...nuevo,
      empresa: {
        ...nuevo.empresa,
        modulos: planElegido ? planElegido.modulos : nuevo.empresa.modulos
      }
    }
    onboardMut.mutate(payload)
  }
`;

content = content.replace(
  /const handleAltaSubmit = \(e: React\.FormEvent\) => \{\n\s*e\.preventDefault\(\)\n\s*onboardMut\.mutate\(nuevo\)\n\s*\}/,
  handleAltaSubmitCode
);

// We need to hide the <ModuloCard> mapping from the form
content = content.replace(
  /<div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3\">\s*\{MODULOS\.map\(mod => \([\s\S]*?\}\)\}\s*<\/div>/g,
  '<div className="text-sm text-gray-500 italic mb-4">Los módulos se asignan automáticamente según el plan seleccionado de la matriz SaaS.</div>'
);

// In the select dropdown for planes, we need to map over saasPlanes instead of PLANES
content = content.replace(
  /\{PLANES\.map\(p => \(\n\s*<option key=\{p\.id\} value=\{p\.id\}>\n\s*\{p\.label\}\n\s*<\/option>\n\s*\)\)\}/g,
  "{saasPlanes.map((p: any) => (<option key={p.id} value={p.id}>{p.nombre}</option>))}"
);

fs.writeFileSync('src/pages/SuperAdminPage.tsx', content);
console.log('SuperAdminPage forms updated');
