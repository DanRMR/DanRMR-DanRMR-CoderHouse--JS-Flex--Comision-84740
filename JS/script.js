let respuestasCorrectas = {}

async function cargarRespuestas() {
  try {
    const response = await fetch("data/respuestasCorrectas.json");

    if (!response.ok) {
      throw new Error(`no se pudo cargar las respuestas`)
    }

    respuestasCorrectas = await response.json();

  } catch (error) {
  }
}

window.addEventListener("DOMContentLoaded", cargarRespuestas);



const form = document.querySelector('#quiz-form');

// ....... GUARDAR PROGRESO DEL EXAMEN EN EL LOCALSTORAGE (antes de darle submit) .......
const progresoExamenKey = "progresoExamen";

let progresoExamen = {
  respuestas: {}
}

form.addEventListener("change", function (event) {
  const input = event.target;

  if (input.type !== "radio") {
    return
  };

  const pregunta = input.name;
  const valor = input.value;

  progresoExamen.respuestas[pregunta] = valor;

  localStorage.setItem(progresoExamenKey, JSON.stringify(progresoExamen));

});

// ...... RESTAURAR PROGRESO DEL EXAMEN ................
window.addEventListener("DOMContentLoaded", function () {
  const progresoGuardado = localStorage.getItem(progresoExamenKey);
  if (!progresoGuardado) {
    return
  };

  progresoExamen = JSON.parse(progresoGuardado)

  for (const pregunta in progresoExamen.respuestas) {
    const valor = progresoExamen.respuestas[pregunta];
    if (!valor) { continue };

    const input = document.querySelector(`input[name="${pregunta}"][value="${valor}"]`);

    if (input) { input.checked = true };
  }
});




const estructuraEvaluacion = {
  grammar: {
    A1: ["q1"],
    A2: ["q2"],
    B1: ["q3"],
    B2: ["q4"],
    C1: ["q5", "q6"]
  },
  vocabulary: {
    A1: ["q7", "q8"],
    A2: ["q9", "q10"],
    B1: ["q11", "q12"],
    bridgeB1_B2: ["q13", "q14"], // El bridge es un nivel intermedio entre B1 y B2 debido a que el salto de ese nivel es relativamente complejo
    B2: ["q15", "q16"],
    C1: ["q17", "q18"]
  },
  reading: {
    A1: ["q19", "q20"],
    A2: ["q21", "q22"],
    B1: ["q23", "q24"],
    bridgeB1_B2: ["q25", "q26"],
    B2: ["q27", "q28"],
    C1: ["q29", "q30"]
  }
};

const resultadoPorHabilidad = {
  grammar: null,
  vocabulary: null,
  reading: null
};

//  ............. AL DARLE SUBMIT .......................... 
form.addEventListener('submit', function (event) {
  event.preventDefault();

  // borrar respuestas anteriores coloreadas sin vuelven a dar submit
  const borrarLabels = document.querySelectorAll('label');
  if (borrarLabels.length > 0) {
    borrarLabels.forEach(label => {
      label.style.backgroundColor = "";
      label.style.padding = "";
    });
  }

  let puntaje = 0
  const respuestasUsuario = {}


  // Para que la pregunta se autocomplete en <span class="correct-answer">
  for (const pregunta in respuestasCorrectas) {

    // para leer la respuesta seleccionada
    const inputSeleccionado = document.querySelector(`input[name="${pregunta}"]:checked`)

    if (inputSeleccionado) {
      respuestasUsuario[pregunta] = inputSeleccionado.value;
    } else {
      respuestasUsuario[pregunta] = null;
    } // SUGERENCIA DE GPT

    // para mostrar la respuesta correcta en el <span>
    const etiquetaSpan = document.querySelector(`#${pregunta}-answer`);

    if (etiquetaSpan) {
      etiquetaSpan.textContent = respuestasCorrectas[pregunta]
    } // (etiquetaSpan !== null)

    // Colorear <label>
    if (inputSeleccionado !== null) {
      const etiquetaLabel = document.querySelector(`label[for="${inputSeleccionado.id}"]`)

      if (inputSeleccionado.value === respuestasCorrectas[pregunta]) {
        puntaje++;
        etiquetaLabel.style.backgroundColor = "#bdffcd";
        etiquetaLabel.style.padding = "5px 10px";

      } else {
        etiquetaLabel.style.backgroundColor = "#febcc1";
        etiquetaLabel.style.padding = "5px 10px";
      }
    }
  }

  // Mostrar puntaje en el HTML
  const resultado = document.querySelector("#numeroRespuestasCorrectas");
  resultado.textContent = `Sacaste ${puntaje} respuestas correctas de ${Object.keys(respuestasCorrectas).length} preguntas.`;

  //  calcular resultados por habilidad
  calcularResultadoPorHabilidad(respuestasUsuario, respuestasCorrectas);

  // calcular nivel general
  const nivelGeneral = calcularNivelGeneralCEFR();

  // mostrar resultados en el DOM
  mostrarResultadoPorHabilidad();
  mostrarNivelGeneral(nivelGeneral);

  // Resultado Final para localStorage
  const resultadoExamen = {
    nivelGeneral: nivelGeneral,
    grammar: resultadoPorHabilidad.grammar.nivel,
    vocabulary: resultadoPorHabilidad.vocabulary.nivel,
    reading: resultadoPorHabilidad.reading.nivel,
    fecha: new Date().toISOString()
  };

  localStorage.setItem(
    "resultadoExamen", JSON.stringify(resultadoExamen)
  )

  localStorage.removeItem(progresoExamenKey);

});

// ................  AL DARLE RESET ..........................  
form.addEventListener("reset", function () {

  for (const pregunta in respuestasCorrectas) {

    // para borrar la respuesta en el <span>
    const borrarSpan = document.querySelector(`#${pregunta}-answer`);
    if (borrarSpan) {
      borrarSpan.textContent = "";
    }

    // para borrar los colores del <label>
    const borrarLabels = document.querySelectorAll('label')
    borrarLabels.forEach(label => {
      label.style.backgroundColor = "";
      label.style.padding = "";
    }
    );

  }

  // Borrar puntaje en el HTML
  const resultado = document.querySelector("#numeroRespuestasCorrectas");
  if (resultado) {
    resultado.textContent = "";
  }

});


// ............. CRITERIO DE EVALUACION POR HABILIDAD (GRAMATICA DEBE SER EXACTA Y VOCABULARY/READING ES UN PORCENTAJE) ............. 
function apruebaNivel(preguntas, respuestasUsuario, respuestasCorrectas, criterioEval) {
  let correctas = 0;

  for (const pregunta of preguntas) {
    if (respuestasUsuario[pregunta] == respuestasCorrectas[pregunta]) {
      correctas++
    }
  }


  if (criterioEval === "exacto") {
    return correctas === preguntas.length;
  }

  // El porcentaje es 70% para vocabulary y reading
  const porcentaje = correctas / preguntas.length;
  return porcentaje >= 0.7;
}

// ............ CALCUALR EL NIVEL DE INGLÉS POR HABILIDAD ....................
function calcularNivelPorHabilidad(habilidad, respuestasUsuario, respuestasCorrectas) {

  const reglasEval = estructuraEvaluacion[habilidad]
  const criterioEval = habilidad === "grammar" ? "exacto" : "porcentaje" // cuando se evalua gramática, el total de las preguntas de esa habilidad debe ser correcto para aprobar, de lo contrario será el 70% (especialmente si más adelante agrego más preguntas)
  const nivelesInternos = ["A1", "A2", "B1", "bridgeB1_B2", "B2", "C1"];

  let nivelActual = 'A0';
  let bridgeSuperado = null;

  for (const nivel of nivelesInternos) {
    const preguntas = reglasEval[nivel];

    if (!preguntas) { continue };

    const aprueba = apruebaNivel(preguntas, respuestasUsuario, respuestasCorrectas, criterioEval);

    if (!aprueba) {
      const resultado = { nivel: nivelActual, bridgeSuperado: bridgeSuperado }
      resultadoPorHabilidad[habilidad] = resultado
      return resultado
    }

    if (nivel == "bridgeB1_B2") {
      bridgeSuperado = ", en progreso hacia B2"
    } else {
      nivelActual = nivel
    }
  }
  const resultadoFinal = { nivel: nivelActual, bridgeSuperado: bridgeSuperado };
  resultadoPorHabilidad[habilidad] = resultadoFinal;
  return resultadoFinal;
}

// ............. RECOPIAL EL RESULTADO NIVEL DE INGLÉS POR HABILIDAD ............. 
function calcularResultadoPorHabilidad(respuestasUsuario, respuestasCorrectas) {
  const nivelGrammar = calcularNivelPorHabilidad('grammar', respuestasUsuario, respuestasCorrectas);
  const nivelVocabulary = calcularNivelPorHabilidad('vocabulary', respuestasUsuario, respuestasCorrectas);
  const nivelReading = calcularNivelPorHabilidad('reading', respuestasUsuario, respuestasCorrectas);

  return {
    grammar: nivelGrammar,
    vocabulary: nivelVocabulary,
    reading: nivelReading
  }
}

const nivelCEFR = ["A1", "A2", "B1", "B2", "C1"];

// ...... CALCULAR NIVEL GENERAL CEFR (Common European Framework of Reference) .............
function calcularNivelGeneralCEFR() {
  const niveles = [
    resultadoPorHabilidad.grammar.nivel,
    resultadoPorHabilidad.vocabulary.nivel,
    resultadoPorHabilidad.reading.nivel
  ];

  let nivelGlobal = "C1";

  // Escoger el nivel MÁS BAJO
  for (const nivel of niveles) {
    if (nivelCEFR.indexOf(nivel) < nivelCEFR.indexOf(nivelGlobal)) {
      nivelGlobal = nivel;
    }
  }

  const vocabularyBridge = resultadoPorHabilidad.vocabulary.bridgeSuperado;
  const readingBridge = resultadoPorHabilidad.reading.bridgeSuperado;

  if (nivelGlobal === "B1" && vocabularyBridge && readingBridge) {
    return "B1 (en progreso hacia B2)";
  }

  return nivelGlobal;
}


// ............. Mostrar resultadoPorHabilidad en DOM ..............
function mostrarResultadoPorHabilidad() {
  const grammar = resultadoPorHabilidad.grammar;
  const vocabulary = resultadoPorHabilidad.vocabulary;
  const reading = resultadoPorHabilidad.reading;

  document.querySelector("#resultadoNivelGrammar").textContent = `Grammar: ${grammar.nivel}`;
  document.querySelector("#resultadoNivelVocabulary").textContent = `Vocabulary: ${vocabulary.nivel} ${vocabulary.bridgeSuperado ?? ""}`;
  document.querySelector("#resultadoNivelReading").textContent = `Reading: ${reading.nivel} ${reading.bridgeSuperado ?? ""}`;
}

function mostrarNivelGeneral(nivelGeneral) {
  const elemento = document.querySelector("#resultadoNivelGeneral");
  if (elemento) {
    elemento.textContent = `Nivel global: ${nivelGeneral}
Tu nivel general refleja el nivel más bajo necesario para funcionar de manera consistente según el CEFR.`;
  }
}

// ..... MOSTRAR ULTIMO RESULTADO GUARDADO EN LOCALSTORAGE ..........
window.addEventListener("DOMContentLoaded", function () {
  const resultadoGuardado = this.localStorage.getItem("resultadoExamen");
  if (!resultadoGuardado) {
    return
  }

  const resultado = JSON.parse(resultadoGuardado);

  const contenedor = document.querySelector("#ultimoResultado");
  if (!contenedor) {
    return
  };

  contenedor.innerHTML = `
  <div class="resultado-guardado">
    <h5>Resultado de tu última  examen</h5>
    <p><em>Fecha: ${new Date(resultado.fecha).toLocaleString()}</em></p>
  </div>
  <div class="resultado-guardado-habilidades">
    <h6 class="fecha-ultimo-resultado"><strong>NIVEL GENERAL DE INGLÉS:</strong> ${resultado.nivelGeneral}</h6> 
    <p>GRAMMAR: <b> ${resultado.grammar} </b></p>
    <p>VOCABULARY:<b> ${resultado.vocabulary} </b></p>
    <p>READING:<b> ${resultado.reading} </b></p>
  </div>
  `;

});