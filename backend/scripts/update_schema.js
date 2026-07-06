const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

const saasPlanModel = `

// ─── SAAS PACKAGING ──────────────────────────────────────────────────────────

model SaasPlan {
  id                 String   @id // ESENCIAL, PROFESIONAL, ESCALA, TOTAL
  nombre             String
  precioMensual      Float
  usuariosBase       Int
  precioUsuarioExtra Float
  tiempoRespuesta    String
  modulos            String[] 
  orden              Int      @default(0)
  
  @@map("saas_planes")
}
`;

if (!schema.includes('model SaasPlan')) {
  schema += saasPlanModel;
  fs.writeFileSync('prisma/schema.prisma', schema);
  console.log('Added SaasPlan to schema');
}
