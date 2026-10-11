const ESPECIALIDADES_POR_OFICIO = {
  gasfiteria: [
    "Fugas de agua",
    "Grifería",
    "Tuberías",
    "Desagües",
    "Instalación de sanitarios",
  ],
  electricidad: [
    "Instalaciones eléctricas",
    "Tableros eléctricos",
    "Cortocircuitos",
    "Puntos de luz",
    "Tomacorrientes",
  ],
  carpinteria: [
    "Muebles a medida",
    "Puertas",
    "Closets",
    "Cocinas",
    "Reparaciones de madera",
  ],
  albanileria: [
    "Tarrajado",
    "Pisos",
    "Muros",
    "Techos",
    "Construcción",
  ],
  pintura: [
    "Pintura interior",
    "Pintura exterior",
    "Empastado",
    "Acabados",
    "Impermeabilización",
  ],
};

const OFICIOS = Object.keys(ESPECIALIDADES_POR_OFICIO);

function especialidadesDeOficio(oficio) {
  return ESPECIALIDADES_POR_OFICIO[oficio];
}

module.exports = { ESPECIALIDADES_POR_OFICIO, OFICIOS, especialidadesDeOficio };
