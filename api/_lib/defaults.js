// Contenido inicial. Se usa solo mientras R2 está vacío; apenas el estudio
// guarda algo desde /admin, manda lo que está en el bucket.

export const CATEGORIES = [
  "Impuestos",
  "Monotributo",
  "Laboral",
  "Economía",
  "Inversiones",
  "Novedades del estudio",
];

export const defaultSite = () => ({
  brand: {
    name: "Estudio Brady",
    descriptor: "Contadores Públicos",
    since: 1971,
  },
  seo: {
    title: "Estudio Brady · Contadores Públicos en Luján",
    description:
      "Estudio contable en Luján desde 1971. Asesoramiento contable, impositivo, laboral y previsional, societario, financiero y auditoría para empresas y particulares.",
  },
  hero: {
    eyebrow: "Contadores Públicos · Luján, Buenos Aires",
    title: "Contadores en Luján\ndesde 1971.",
    subtitle:
      "Desde 1971 asesoramos a empresas y particulares en materia contable, impositiva, laboral, societaria y financiera, con un equipo de profesionales que se adapta a los requerimientos de cada cliente.",
    image: "",
    ctaPrimary: "Pedir un turno",
    ctaSecondary: "Ver servicios",
  },
  about: {
    title: "Un estudio con trayectoria familiar",
    text:
      "Estudio Brady nació en Luján en 1971, fundado por Edmundo Brady, y hoy lo conduce una nueva generación de socios. A lo largo de los años desarrollamos una alta capacidad de respuesta para acompañar a empresas y personas en cada etapa.\n\nNos esforzamos por adaptarnos a los requerimientos únicos de cada cliente: trabajamos con un equipo de contadores y profesionales del derecho que aborda cada caso de manera integral.",
    image: "",
    points: [
      "Desde 1971 en Lavalle 316, Luján",
      "Equipo interdisciplinario: contadores, abogados y escribanos",
      "Atención a empresas y particulares",
    ],
  },
  services: [
    {
      icon: "ledger",
      title: "Contabilidad",
      text: "Registración contable, estados contables y balances para empresas y particulares.",
      items: ["Registración contable", "Estados contables y balances", "Libros obligatorios", "Certificaciones"],
    },
    {
      icon: "scale",
      title: "Asesoramiento impositivo",
      text: "Planificación y liquidación de impuestos nacionales, provinciales y municipales.",
      items: ["IVA y Ganancias", "Bienes Personales", "Ingresos Brutos", "Monotributo"],
    },
    {
      icon: "users",
      title: "Laboral y previsional",
      text: "Liquidación de sueldos, cargas sociales y asesoramiento en temas laborales y previsionales.",
      items: ["Liquidación de sueldos", "Cargas sociales", "Altas y bajas de personal", "Trámites previsionales"],
    },
    {
      icon: "building",
      title: "Societario",
      text: "Constitución y funcionamiento de sociedades, con el respaldo de profesionales del derecho y escribanía.",
      items: ["Constitución de sociedades", "Inscripciones y reformas", "Actas y asambleas", "Asesoramiento legal y notarial"],
    },
    {
      icon: "chart",
      title: "Asesoramiento financiero y administrativo",
      text: "Herramientas de gestión y análisis para tomar decisiones con información clara.",
      items: ["Análisis financiero", "Organización administrativa", "Costos y presupuestos", "Proyecciones"],
    },
    {
      icon: "shield",
      title: "Auditoría",
      text: "Revisión independiente de estados contables y procesos para dar confianza a socios, bancos y terceros.",
      items: ["Auditoría de estados contables", "Revisión de procesos", "Informes especiales", "Control interno"],
    },
  ],
  team: [
    { name: "Edmundo Brady", role: "Socio fundador", bio: "", photo: "" },
    { name: "José Brady", role: "Socio director", bio: "", photo: "" },
    { name: "Federico Brady", role: "Socio director", bio: "", photo: "" },
    { name: "Romina Albanese", role: "Contadora Pública", bio: "", photo: "" },
    { name: "Florencia Angelo", role: "Abogada · Escribana", bio: "", photo: "" },
  ],
  location: {
    address: "Lavalle 316",
    city: "B6700 · Luján, Provincia de Buenos Aires",
    mapQuery: "Estudio Brady Contadores Públicos, Lavalle 316, Luján, Buenos Aires",
    hours: [{ days: "Atención", time: "Con turno previo" }],
    howToGet: "En el centro de Luján, a pocas cuadras de la Basílica. Llamanos para coordinar tu turno.",
  },
  contact: {
    phone: "02323 43-0436",
    phone2: "02323 42-2969",
    whatsapp: "542323430436",
    email: "",
    instagram: "",
    facebook: "https://www.facebook.com/estudiobrady/",
    linkedin: "",
  },
});

export const defaultNotices = () => {
  const d = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
  return [
    {
      id: "n1",
      type: "info",
      title: "Atención con turno previo",
      text: "Para ser atendido en el estudio, coordiná tu turno llamando al 02323 43-0436.",
      link: "",
      date: d(0),
      until: "",
      pinned: true,
      active: true,
    },
  ];
};

export const defaultPosts = () => {
  const now = Date.now();
  const iso = (days) => new Date(now - days * 864e5).toISOString();
  return [
    {
      id: "p1",
      slug: "como-prepararte-para-la-recategorizacion",
      title: "Cómo prepararte para la próxima recategorización del Monotributo",
      category: "Monotributo",
      author: "Estudio Brady",
      date: iso(1),
      cover: "",
      pinned: true,
      published: true,
      excerpt:
        "Qué parámetros se miran, cómo calcular tu facturación de los últimos doce meses y qué hacer si estás cerca del tope.",
      body:
        "Cada semestre los monotributistas tienen que revisar si siguen en la categoría correcta. No es un trámite opcional: si superás los parámetros y no te recategorizás, ARCA puede hacerlo de oficio y cobrar la diferencia con intereses.\n\n## Qué se tiene en cuenta\n\n- **Ingresos brutos** de los últimos doce meses.\n- **Superficie afectada** a la actividad.\n- **Energía eléctrica** consumida.\n- **Alquileres** devengados.\n\nBasta con superar uno solo de esos parámetros para subir de categoría.\n\n## Cómo calcular tu facturación\n\nSumá todas las facturas emitidas en los últimos doce meses, incluidas las notas de débito, y restá las notas de crédito. Ese número es el que se compara con la tabla vigente.\n\n## Si estás cerca del tope\n\nConviene revisarlo con tiempo. A veces alcanza con reorganizar la facturación de fin de año; otras veces es momento de evaluar el pase a Responsable Inscripto antes de quedar excluido.\n\n¿Tenés dudas con tu caso? Dejá tu consulta abajo y te respondemos.",
      comments: [],
    },
    {
      id: "p2",
      slug: "inflacion-y-precios-como-actualizar-tus-honorarios",
      title: "Inflación y precios: cómo actualizar lo que cobrás sin perder clientes",
      category: "Economía",
      author: "Estudio Brady",
      date: iso(4),
      cover: "",
      pinned: false,
      published: true,
      excerpt:
        "Una guía práctica para revisar tus precios con datos, comunicar los aumentos y proteger tu margen.",
      body:
        "Actualizar precios es una de las decisiones que más se postergan. El problema es que cada mes que pasa sin revisar, el margen se achica sin que lo notes.\n\n## Empezá por tus costos\n\nArmá una lista simple con tus costos fijos y variables. Si no sabés cuánto te cuesta producir o prestar tu servicio, cualquier aumento es una apuesta.\n\n## Usá un índice de referencia\n\nAtar tus precios a un índice público (como el IPC) hace que el aumento sea previsible y fácil de explicar.\n\n## Comunicá con anticipación\n\nUn aviso con quince o treinta días de margen genera mucha menos fricción que un aumento sorpresa.",
      comments: [],
    },
    {
      id: "p3",
      slug: "checklist-para-contratar-tu-primer-empleado",
      title: "Checklist para contratar a tu primer empleado",
      category: "Laboral",
      author: "Estudio Brady",
      date: iso(9),
      cover: "",
      pinned: false,
      published: true,
      excerpt:
        "Alta temprana, convenio aplicable, ART y todo lo que tenés que resolver antes del primer día de trabajo.",
      body:
        "Contratar a alguien es una gran noticia para tu negocio, pero hay que hacerlo en regla desde el primer día.\n\n## Antes del ingreso\n\n1. Inscribirte como empleador en ARCA.\n2. Contratar una ART.\n3. Definir el convenio colectivo aplicable.\n4. Hacer el alta temprana en Simplificación Registral.\n\n## Todos los meses\n\n- Liquidar el recibo de sueldo.\n- Presentar el F.931 y pagar las cargas sociales.\n- Registrar el Libro de Sueldos Digital.\n\nUn error en la registración puede salir muy caro en un reclamo laboral. Si tenés dudas, consultanos antes de firmar.",
      comments: [],
    },
    {
      id: "p4",
      slug: "plazo-fijo-fci-o-cauciones-donde-dejar-el-capital-de-trabajo",
      title: "Plazo fijo, FCI o cauciones: dónde dejar el capital de trabajo",
      category: "Inversiones",
      author: "Estudio Brady",
      date: iso(14),
      cover: "",
      pinned: false,
      published: true,
      excerpt:
        "Comparamos liquidez, riesgo y tratamiento impositivo de las alternativas más usadas por PyMEs.",
      body:
        "El dinero que tu empresa necesita para operar en las próximas semanas no debería quedar inmóvil en una cuenta corriente.\n\n## Lo que hay que mirar\n\n- **Liquidez:** cuándo podés disponer del dinero.\n- **Riesgo:** qué tan estable es el rendimiento.\n- **Impuestos:** cómo impacta en Ganancias y en el impuesto a los débitos y créditos.\n\n## Nuestra recomendación\n\nSepará el capital en tramos según cuándo lo vas a usar. Lo que necesitás en días, en instrumentos de liquidez inmediata; lo que no vas a tocar en un mes o más, en alternativas a plazo.\n\n*Este contenido es informativo y no constituye una recomendación de inversión personalizada.*",
      comments: [],
    },
  ];
};

// Índice liviano para listar el foro sin bajar cada publicación.
export function postMeta(p) {
  const comments = p.comments || [];
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    category: p.category,
    author: p.author,
    date: p.date,
    cover: p.cover || "",
    pinned: Boolean(p.pinned),
    published: p.published !== false,
    excerpt: p.excerpt || "",
    commentCount: comments.filter((c) => c.status === "approved").length,
    pendingCount: comments.filter((c) => c.status === "pending").length,
  };
}
