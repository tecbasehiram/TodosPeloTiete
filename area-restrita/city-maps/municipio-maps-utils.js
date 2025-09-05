// Utilitários para municipio-maps

/**
 * Salva um item no localStorage com tempo de expiração (em milissegundos)
 */
export function setItemWithExpiry(key, value, ttlInMilliseconds = 1 * 60 * 60 * 1000) {
  const now = new Date();
  const item = {
    value: value,
    expiry: now.getTime() + ttlInMilliseconds,
  };
  localStorage.setItem(key, JSON.stringify(item));
}

/**
 * Recupera um item do localStorage considerando o tempo de expiração
 */
export function getItemWithExpiry(key) {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) return null;
  try {
    const item = JSON.parse(itemStr);
    if (new Date().getTime() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Normaliza um nome removendo acentos e espaços
 */
export function normalizarNome(nome) {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[ 0-9f]/g, '')
    .replace(/\s/g, '')
    .replace(/[\s()/]/g, '');
}

/**
 * Encontra a primeira coordenada válida em uma estrutura de geometria
 */
export function findFirstCoordinate(geometry) {
  if (!Array.isArray(geometry)) return null;
  let current = geometry;
  while (Array.isArray(current) && Array.isArray(current[0])) {
    current = current[0];
  }
  if (Array.isArray(current) && current.length >= 2 && typeof current[0] === 'number' && typeof current[1] === 'number') {
    return [current[0], current[1]];
  }
  return null;
}

/**
 * Identifica o sistema de coordenadas de uma geometria
 */
export function identificarSistema(geometry) {
  if (!geometry || !Array.isArray(geometry)) return 'Indefinido';
  function extrairCoordenadas(arr) {
    if (typeof arr[0] === 'number' && typeof arr[1] === 'number') {
      return arr;
    } else if (Array.isArray(arr[0])) {
      return extrairCoordenadas(arr[0]);
    }
    return null;
  }
  const coords = extrairCoordenadas(geometry);
  if (!coords) return 'Indefinido';
  const [x, y] = coords;
  if (x >= -180 && x <= 180 && y >= -90 && y <= 90) {
    return 'WGS84';
  }
  if (x >= 100000 && x <= 900000 && y >= 0 && y <= 10000000) {
    return 'UTM';
  }
  return 'Desconhecido';
}

/**
 * Retorna a cor correspondente ao índice AutoCAD
 */
export function getAutoCADColor(colorIndex) {
  const colorMap = {
    1: 'red', 2: 'yellow', 3: 'green', 4: 'cyan',
    5: 'blue', 6: 'magenta', 7: '#FAFAFA', 
    8: 'darkgray', 9: 'lightgray', 10: 'red', 11: '#654321', 12: '#ffffff', 13: '#00d1ff',
    14: '#cacaca', 15: '#3f5b71', 16: 'green', 17: '#276521', 18: '#16a808', 19: '#b4ffab', 20: 'pink',
    21: '#5d8758', 22: '#7a6412', 23: '#b08f14', 24: '#ffa200',
    // Gradiente vermelho -> verde para estabelecimentos de ensino
    25: '#ff0000', // Vermelho puro (sem matrículas)
    26: '#ff4d4d', // Vermelho claro
    27: '#ff8080', // Vermelho mais claro
    28: '#ffb366', // Laranja
    29: '#ffcc66', // Laranja claro
    30: '#ffff66', // Amarelo
    31: '#ccff66', // Amarelo-esverdeado
    32: '#99ff66', // Verde claro
    33: '#66ff66', // Verde mais claro
    34: '#33ff33', // Verde brilhante
    35: '#00ff00'  // Verde puro (muitas matrículas)
  };
  return colorMap[colorIndex] || '#FFFFFF'; 
}

/**
 * Formata um objeto JSON para exibição em HTML
 */
export function formatJsonForDisplay(jsonData) {
  let htmlContent = '';
  const keysToExclude = ['NM_MUN', 'id', 'icon_class', 'Color', 'icon_size'];
  for (const key in jsonData) {
    if (Object.hasOwnProperty.call(jsonData, key)) {
      if (keysToExclude.includes(key)) continue;
      let value = jsonData[key];
      let displayKey = key;
      displayKey = displayKey.charAt(0).toUpperCase() + displayKey.slice(1).replace(/([A-Z])/g, ' $1');
      displayKey = displayKey.replace(/_/g, ' ');
      if (key.toLowerCase() === 'properties' && typeof value === 'object' && value !== null) {
        htmlContent += formatJsonForDisplay(value);
        return htmlContent;
      }
      if (key === 'descriptio' && typeof value === 'string' && value) {
        let decodedHtml = value.replace(/\\n/g, '').replace(/\\"/g, '"');
        htmlContent += `<div><strong>${displayKey}:</strong><div style="margin-left: 10px;">${decodedHtml}</div></div>`;
      } else if (typeof value === 'object' && value !== null) {
        let nestedContent = '';
        if (Array.isArray(value)) {
          if (value.every(item => typeof item !== 'object' && item !== null)) {
            nestedContent = value.join(', ');
          } else {
            let itemsFormatted = value.map(item => {
              if (typeof item === 'object' && item !== null) {
                return formatJsonForDisplay(item);
              } else {
                return String(item);
              }
            }).join('<br>');
            nestedContent = `<div style="margin-left: 10px;">${itemsFormatted}</div>`;
          }
        } else {
          nestedContent = '<div style="margin-left: 10px;">' + formatJsonForDisplay(value) + '</div>';
        }
        htmlContent += `<div><strong>${displayKey}:</strong> ${nestedContent}</div>`;
      } else {
        let displayValue = (value === null || value === undefined || value === '') ? 'N/A' : String(value);
        htmlContent += `<div><strong>${displayKey}:</strong> ${displayValue}</div>`;
      }
    }
  }
  return htmlContent;
}

/**
 * Retorna os bounds de um shape (usando API do mapa ou fallback)
 */
export function getBoundsFromShape(shape) {
    if (!shape) return null;
    let bounds = null;
    if (typeof shape.getBounds === 'function') {
        bounds = shape.getBounds()
        if(!bounds) {
            console.log('Bounds não encontrados')
        };
    }
    if (typeof shape.getOptions === 'function') {
        const options = shape.getOptions();
        if (options && options.position) {
            bounds = new atlas.data.BoundingBox(options.position, options.position);
        }
    }
    return bounds;
} 

export function utmToWgs84(easting, northing, zone, isSouthernHemisphere, datum = 'WGS84') {
    if (typeof proj4 === 'undefined') {
        console.error("Biblioteca proj4js não carregada. Não é possível transformar coordenadas UTM.");
        return null;
    }

    if (!Number.isFinite(easting) || !Number.isFinite(northing)) {
        console.error(`Coordenadas de entrada inválidas ou não finitas. Impossível converter. Easting: ${easting}, Northing: ${northing}`);
        return null; 
    }

    try {
        let utmProjString = `+proj=utm +zone=${zone}`;
        if (isSouthernHemisphere) {
            utmProjString += " +south";
        }
        utmProjString += ` +datum=${datum} +units=m +no_defs`;
        
        const wgs84ProjString = "+proj=longlat +datum=WGS84 +no_defs";

        return proj4(utmProjString, wgs84ProjString, [easting, northing]);

    } catch (e) {
        console.error(`Erro na conversão UTM para WGS84 (Zona: ${zone}, Datum: ${datum}):`, e);
        return null;
    }
}
